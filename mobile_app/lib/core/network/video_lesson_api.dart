import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/video/domain/video_lesson.dart';
import '../auth/account_controller.dart';
import '../config/app_config.dart';
import '../security/mobile_attestation.dart';

class VideoApiException implements Exception {
  const VideoApiException(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  @override
  String toString() => message;
}

enum ReadyNotificationPermission {
  notDetermined,
  denied,
  authorized,
  provisional,
}

abstract interface class ReadyNotificationMessaging {
  bool get isAvailable;

  bool get isAutoInitEnabled;

  Stream<String> get onTokenRefresh;

  Future<ReadyNotificationPermission> getPermission();

  Future<ReadyNotificationPermission> requestPermission();

  Future<void> setAutoInitEnabled(bool enabled);

  Future<String?> getToken();

  Future<String?> getApnsToken();

  Future<void> deleteToken();
}

class FirebaseReadyNotificationMessaging implements ReadyNotificationMessaging {
  @override
  bool get isAvailable => Firebase.apps.isNotEmpty;

  @override
  bool get isAutoInitEnabled => _messaging.isAutoInitEnabled;

  FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  @override
  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  @override
  Future<ReadyNotificationPermission> getPermission() async =>
      _permissionFromFirebase(
        (await _messaging.getNotificationSettings()).authorizationStatus,
      );

  @override
  Future<ReadyNotificationPermission> requestPermission() async =>
      _permissionFromFirebase(
        (await _messaging.requestPermission(
          alert: true,
          announcement: false,
          badge: true,
          carPlay: false,
          criticalAlert: false,
          provisional: false,
          sound: true,
        )).authorizationStatus,
      );

  @override
  Future<void> setAutoInitEnabled(bool enabled) =>
      _messaging.setAutoInitEnabled(enabled);

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Future<String?> getApnsToken() => _messaging.getAPNSToken();

  @override
  Future<void> deleteToken() => _messaging.deleteToken();

  static ReadyNotificationPermission _permissionFromFirebase(
    AuthorizationStatus status,
  ) => switch (status) {
    AuthorizationStatus.authorized => ReadyNotificationPermission.authorized,
    AuthorizationStatus.provisional => ReadyNotificationPermission.provisional,
    AuthorizationStatus.denied => ReadyNotificationPermission.denied,
    AuthorizationStatus.notDetermined =>
      ReadyNotificationPermission.notDetermined,
  };
}

class VideoLessonApi {
  VideoLessonApi({
    required this.account,
    http.Client? client,
    String? baseUrl,
    ReadyNotificationMessaging? notificationMessaging,
    Future<String> Function()? appVersion,
    this.notificationDisableTimeout = const Duration(seconds: 3),
  }) : _client = client ?? http.Client(),
       _notificationMessaging =
           notificationMessaging ?? FirebaseReadyNotificationMessaging(),
       _appVersion = appVersion ?? _platformAppVersion,
       _baseUrl = (baseUrl ?? AppConfig.apiBaseUrl).replaceFirst(
         RegExp(r'/$'),
         '',
       );

  final AccountController account;
  final Duration notificationDisableTimeout;
  final http.Client _client;
  final ReadyNotificationMessaging _notificationMessaging;
  final Future<String> Function() _appVersion;
  final String _baseUrl;
  StreamSubscription<String>? _tokenRefreshSubscription;
  Future<bool>? _notificationSetup;
  String? _notificationSetupUserId;
  int? _notificationSetupGeneration;
  String? _registeredNotificationUserId;
  String? _registeredNotificationToken;
  var _notificationGeneration = 0;
  Future<void> _messagingMutation = Future<void>.value();
  static const _legacyNotificationOfferHandledKey =
      'mathsolver.video-ready-notification-offer.v1';
  static const _notificationOfferHandledKeyPrefix =
      'mathsolver.video-ready-notification-offer.user.v2.';
  static const _notificationConsentKeyPrefix =
      'mathsolver.video-ready-notification-consent.user.v2.';

  Future<VideoJob> createJob({
    required String requestKey,
    required String problem,
    required String solution,
    String? expectedUserId,
  }) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/video/jobs'),
          headers: await _headers(
            includeContentType: true,
            expectedUserId: expectedUserId,
          ),
          body: jsonEncode({
            'requestKey': requestKey,
            'problem': problem,
            'solution': solution,
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    return _readJob(response, 'The video explanation could not be started.');
  }

  Future<VideoJob> getJob(String jobId, {String? expectedUserId}) async {
    final response = await _client
        .get(
          Uri.parse(
            '$_baseUrl/api/mobile/v1/video/jobs/'
            '${Uri.encodeComponent(jobId)}',
          ),
          headers: await _headers(expectedUserId: expectedUserId),
        )
        .timeout(AppConfig.requestTimeout);
    return _readJob(
      response,
      'The video explanation status could not be loaded.',
    );
  }

  Future<VideoJobList> listJobs({String? expectedUserId}) async {
    final response = await _client
        .get(
          Uri.parse('$_baseUrl/api/mobile/v1/video/jobs'),
          headers: await _headers(expectedUserId: expectedUserId),
        )
        .timeout(AppConfig.requestTimeout);
    final body = _jsonObject(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _readError(
        response,
        body,
        'Your video library could not be loaded.',
      );
    }
    if (body['jobs'] is! List || body['quota'] is! Map) {
      throw const VideoApiException(
        'The video library returned an unreadable response.',
        code: 'invalid_video_library_response',
      );
    }
    return VideoJobList.fromJson(body);
  }

  Future<void> deleteJob(String jobId, {String? expectedUserId}) async {
    final response = await _client
        .delete(
          Uri.parse(
            '$_baseUrl/api/mobile/v1/video/jobs/'
            '${Uri.encodeComponent(jobId)}',
          ),
          headers: await _headers(expectedUserId: expectedUserId),
        )
        .timeout(AppConfig.requestTimeout);
    if ((response.statusCode < 200 || response.statusCode >= 300) &&
        response.statusCode != 404) {
      final body = _jsonObject(response.body);
      throw _readError(response, body, 'The video could not be deleted.');
    }
  }

  Future<bool> enableReadyNotifications({String? expectedUserId}) async {
    final currentUserId = account.isSignedIn ? account.userId : null;
    final userId = expectedUserId ?? currentUserId;
    if (!_notificationMessaging.isAvailable ||
        userId == null ||
        currentUserId != userId) {
      return false;
    }
    final generation = _notificationGeneration;
    try {
      final permission = await _notificationMessaging.requestPermission();
      if (!_isReadyNotificationPermission(permission) ||
          !_isNotificationContextCurrent(userId, generation)) {
        return false;
      }
      await _writeNotificationPreference(
        userId,
        handled: true,
        consented: true,
      );
      if (!_isNotificationContextCurrent(userId, generation)) return false;
      return await _activateReadyNotifications(userId, generation);
    } on Object {
      return false;
    }
  }

  Future<bool> restoreReadyNotifications({String? expectedUserId}) async {
    final currentUserId = account.isSignedIn ? account.userId : null;
    final userId = expectedUserId ?? currentUserId;
    if (!_notificationMessaging.isAvailable ||
        userId == null ||
        currentUserId != userId) {
      return false;
    }
    final generation = _notificationGeneration;
    try {
      if (!await _hasNotificationConsent(userId) ||
          !_isNotificationContextCurrent(userId, generation)) {
        return false;
      }
      final permission = await _notificationMessaging.getPermission();
      if (!_isReadyNotificationPermission(permission) ||
          !_isNotificationContextCurrent(userId, generation)) {
        return false;
      }
      return await _activateReadyNotifications(userId, generation);
    } on Object {
      return false;
    }
  }

  Future<bool> shouldOfferReadyNotifications() async {
    final userId = account.isSignedIn ? account.userId : null;
    if (!_notificationMessaging.isAvailable || userId == null) {
      return false;
    }
    try {
      if (await _notificationMessaging.getPermission() ==
              ReadyNotificationPermission.denied ||
          account.userId != userId) {
        return false;
      }
      final preferences = await SharedPreferences.getInstance();
      final handled =
          preferences.getBool(_notificationOfferHandledKey(userId)) ?? false;
      return !handled;
    } on Object {
      return false;
    }
  }

  Future<void> markReadyNotificationOfferHandled({
    required String expectedUserId,
  }) async {
    if (account.userId != expectedUserId) return;
    await _writeNotificationPreference(expectedUserId, handled: true);
  }

  Future<void> clearReadyNotificationPreferences(String ownerUserId) async {
    if (ownerUserId.isEmpty) return;
    final preferences = await SharedPreferences.getInstance();
    await Future.wait([
      preferences.remove(_notificationOfferHandledKey(ownerUserId)),
      preferences.remove(_notificationConsentKey(ownerUserId)),
    ]);
  }

  Future<void> disableReadyNotifications() async {
    final userId = account.isSignedIn ? account.userId : null;
    final cancellation = _invalidateNotificationLifecycle();
    try {
      if (_notificationMessaging.isAvailable && userId != null) {
        await _unregisterReadyNotifications(
          userId,
        ).timeout(notificationDisableTimeout);
      }
    } on Object {
      // Account sign-out must remain available while offline. A later token
      // registration transaction also moves ownership away from this account.
    } finally {
      await cancellation;
      if (_notificationMessaging.isAvailable) {
        await _clearLocalReadyNotifications();
      }
    }
  }

  Future<void> deactivateReadyNotifications() async {
    final cancellation = _invalidateNotificationLifecycle();
    await cancellation;
    if (_notificationMessaging.isAvailable) {
      await _clearLocalReadyNotifications();
    }
  }

  Future<void> _unregisterReadyNotifications(String userId) async {
    final token = await _notificationMessaging.getToken();
    if (token == null || token.isEmpty) return;
    final response = await _client.delete(
      Uri.parse('$_baseUrl/api/mobile/v1/devices'),
      headers: await _headers(includeContentType: true, expectedUserId: userId),
      body: jsonEncode({'token': token, 'captchaToken': null}),
    );
    if ((response.statusCode < 200 || response.statusCode >= 300) &&
        response.statusCode != 404) {
      throw const VideoApiException(
        'Video-ready notifications could not be disabled on the server.',
        code: 'notification_unregistration_failed',
      );
    }
    // Local token removal still runs if the server is temporarily unreachable.
    // Account deletion also removes the registry server-side.
  }

  Future<bool> _activateReadyNotifications(String userId, int generation) {
    if (!_isNotificationContextCurrent(userId, generation)) {
      return Future<bool>.value(false);
    }
    final existing = _notificationSetup;
    if (existing != null &&
        _notificationSetupUserId == userId &&
        _notificationSetupGeneration == generation) {
      return existing;
    }
    final setup = _activateReadyNotificationsOnce(userId, generation);
    _notificationSetup = setup;
    _notificationSetupUserId = userId;
    _notificationSetupGeneration = generation;
    unawaited(_clearNotificationSetupWhenDone(setup));
    return setup;
  }

  Future<void> _clearNotificationSetupWhenDone(Future<bool> setup) async {
    try {
      await setup;
    } on Object {
      // The public enable/restore methods turn setup failures into `false`.
    } finally {
      if (identical(_notificationSetup, setup)) {
        _notificationSetup = null;
        _notificationSetupUserId = null;
        _notificationSetupGeneration = null;
      }
    }
  }

  Future<bool> _activateReadyNotificationsOnce(
    String userId,
    int generation,
  ) async {
    if (!_isNotificationContextCurrent(userId, generation)) return false;
    await _setNotificationAutoInit(true);
    if (!_isNotificationContextCurrent(userId, generation)) return false;
    _attachTokenRefreshListener(generation);
    if (Platform.isIOS) {
      for (var attempt = 0; attempt < 6; attempt++) {
        if (!_isNotificationContextCurrent(userId, generation)) return false;
        final apnsToken = await _notificationMessaging.getApnsToken();
        if (!_isNotificationContextCurrent(userId, generation)) return false;
        if (apnsToken != null) break;
        await Future<void>.delayed(const Duration(milliseconds: 350));
      }
    }
    if (!_isNotificationContextCurrent(userId, generation)) return false;
    final token = await _notificationMessaging.getToken();
    if (token == null ||
        token.isEmpty ||
        !_isNotificationContextCurrent(userId, generation)) {
      return false;
    }
    if (_registeredNotificationUserId == userId &&
        _registeredNotificationToken == token) {
      return true;
    }
    await _registerDeviceToken(
      token,
      expectedUserId: userId,
      expectedGeneration: generation,
    );
    return _isNotificationContextCurrent(userId, generation);
  }

  void _attachTokenRefreshListener(int generation) {
    _tokenRefreshSubscription ??= _notificationMessaging.onTokenRefresh.listen((
      nextToken,
    ) async {
      final userId = account.isSignedIn ? account.userId : null;
      if (userId == null ||
          nextToken.isEmpty ||
          !_isNotificationContextCurrent(userId, generation)) {
        return;
      }
      try {
        if (!_notificationMessaging.isAutoInitEnabled ||
            !await _hasNotificationConsent(userId) ||
            !_isNotificationContextCurrent(userId, generation)) {
          return;
        }
        final permission = await _notificationMessaging.getPermission();
        if (!_isReadyNotificationPermission(permission) ||
            !_isNotificationContextCurrent(userId, generation)) {
          return;
        }
        await _registerDeviceToken(
          nextToken,
          expectedUserId: userId,
          expectedGeneration: generation,
        );
      } on Object {
        // A later app open, resume, or token refresh retries registration.
      }
    });
  }

  static bool _isReadyNotificationPermission(
    ReadyNotificationPermission permission,
  ) =>
      permission == ReadyNotificationPermission.authorized ||
      permission == ReadyNotificationPermission.provisional;

  Future<bool> _hasNotificationConsent(String userId) async {
    final preferences = await SharedPreferences.getInstance();
    final consentKey = _notificationConsentKey(userId);
    final stored = preferences.getBool(consentKey);
    if (stored != null) return stored;

    // Migrate the previous single-account preference only when FCM was
    // explicitly enabled. Auto-init defaults to false in both platform
    // manifests, so this combination means the user accepted the old offer.
    final legacyHandled =
        preferences.getBool(_legacyNotificationOfferHandledKey) ?? false;
    if (!legacyHandled || !_notificationMessaging.isAutoInitEnabled) {
      return false;
    }
    await _writeNotificationPreference(
      userId,
      handled: true,
      consented: true,
      preferences: preferences,
    );
    return true;
  }

  Future<void> _writeNotificationPreference(
    String userId, {
    required bool handled,
    bool? consented,
    SharedPreferences? preferences,
  }) async {
    final store = preferences ?? await SharedPreferences.getInstance();
    await store.setBool(_notificationOfferHandledKey(userId), handled);
    if (consented != null) {
      await store.setBool(_notificationConsentKey(userId), consented);
    }
  }

  static String _notificationOfferHandledKey(String userId) =>
      '$_notificationOfferHandledKeyPrefix${_encodedUserId(userId)}';

  static String _notificationConsentKey(String userId) =>
      '$_notificationConsentKeyPrefix${_encodedUserId(userId)}';

  static String _encodedUserId(String userId) =>
      base64Url.encode(utf8.encode(userId)).replaceAll('=', '');

  Future<void> _registerDeviceToken(
    String token, {
    required String expectedUserId,
    required int expectedGeneration,
  }) async {
    final appVersion = await _appVersion();
    if (!_isNotificationContextCurrent(expectedUserId, expectedGeneration)) {
      throw const AccountException(
        'The signed-in account changed before notifications were enabled.',
      );
    }
    final headers = await _headers(
      includeContentType: true,
      expectedUserId: expectedUserId,
    );
    if (!_isNotificationContextCurrent(expectedUserId, expectedGeneration)) {
      throw const AccountException(
        'The signed-in account changed before notifications were enabled.',
      );
    }
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/devices'),
          headers: headers,
          body: jsonEncode({
            'token': token,
            'platform': Platform.isIOS ? 'ios' : 'android',
            'appVersion': appVersion,
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    if (!_isNotificationContextCurrent(expectedUserId, expectedGeneration)) {
      throw const AccountException(
        'The signed-in account changed before notifications were enabled.',
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const VideoApiException(
        'Video-ready notifications could not be enabled.',
        code: 'notification_registration_failed',
      );
    }
    _registeredNotificationUserId = expectedUserId;
    _registeredNotificationToken = token;
  }

  bool _isNotificationContextCurrent(String userId, int generation) =>
      generation == _notificationGeneration &&
      account.isSignedIn &&
      account.userId == userId;

  Future<void> _invalidateNotificationLifecycle() {
    _notificationGeneration++;
    final subscription = _tokenRefreshSubscription;
    _tokenRefreshSubscription = null;
    _notificationSetup = null;
    _notificationSetupUserId = null;
    _notificationSetupGeneration = null;
    _registeredNotificationUserId = null;
    _registeredNotificationToken = null;
    return subscription?.cancel() ?? Future<void>.value();
  }

  Future<void> _clearLocalReadyNotifications() async {
    try {
      await _setNotificationAutoInit(false);
    } on Object {
      // Token deletion below still prevents delivery if this setting fails.
    }
    try {
      await _deleteNotificationToken();
    } on Object {
      // The server registry is authoritative if local FCM cleanup fails.
    }
  }

  Future<void> _setNotificationAutoInit(bool enabled) => _runMessagingMutation(
    () => _notificationMessaging.setAutoInitEnabled(enabled),
  );

  Future<void> _deleteNotificationToken() =>
      _runMessagingMutation(_notificationMessaging.deleteToken);

  Future<void> _runMessagingMutation(Future<void> Function() mutation) {
    final operation = _messagingMutation.then((_) => mutation());
    _messagingMutation = operation.catchError((Object _) {});
    return operation;
  }

  Future<Map<String, String>> _headers({
    bool includeContentType = false,
    String? expectedUserId,
  }) async {
    final token = await account.getIdToken(expectedUserId: expectedUserId);
    return MobileAttestation.headers(
      json: includeContentType,
      additional: {'Authorization': 'Bearer $token'},
    );
  }

  static VideoJob _readJob(http.Response response, String fallback) {
    final body = _jsonObject(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _readError(response, body, fallback);
    }
    final job = body['job'];
    if (job is! Map) {
      throw const VideoApiException(
        'The video studio returned an unreadable response.',
        code: 'invalid_video_response',
      );
    }
    return VideoJob.fromJson(job.map((key, value) => MapEntry('$key', value)));
  }

  static VideoApiException _readError(
    http.Response response,
    Map<String, Object?> body,
    String fallback,
  ) {
    return VideoApiException(
      body['error'] is String ? body['error'] as String : fallback,
      code: body['code'] is String ? body['code'] as String : null,
      statusCode: response.statusCode,
    );
  }

  static Map<String, Object?> _jsonObject(String body) {
    try {
      final value = jsonDecode(body);
      if (value is Map<String, Object?>) {
        return value;
      }
    } on FormatException {
      // The caller uses a contextual fallback.
    }
    return const {};
  }

  void close() {
    unawaited(_invalidateNotificationLifecycle());
    _client.close();
  }

  static Future<String> _platformAppVersion() async =>
      (await PackageInfo.fromPlatform()).version;
}

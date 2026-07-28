import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;

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

class VideoLessonApi {
  VideoLessonApi({required this.account, http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? AppConfig.apiBaseUrl).replaceFirst(
        RegExp(r'/$'),
        '',
      );

  final AccountController account;
  final http.Client _client;
  final String _baseUrl;
  StreamSubscription<String>? _tokenRefreshSubscription;

  Future<VideoJob> createJob({
    required String requestKey,
    required String problem,
    required String solution,
  }) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/video/jobs'),
          headers: await _headers(includeContentType: true),
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

  Future<VideoJob> getJob(String jobId) async {
    final response = await _client
        .get(
          Uri.parse(
            '$_baseUrl/api/mobile/v1/video/jobs/'
            '${Uri.encodeComponent(jobId)}',
          ),
          headers: await _headers(),
        )
        .timeout(AppConfig.requestTimeout);
    return _readJob(
      response,
      'The video explanation status could not be loaded.',
    );
  }

  Future<VideoJobList> listJobs() async {
    final response = await _client
        .get(
          Uri.parse('$_baseUrl/api/mobile/v1/video/jobs'),
          headers: await _headers(),
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

  Future<void> deleteJob(String jobId) async {
    final response = await _client
        .delete(
          Uri.parse(
            '$_baseUrl/api/mobile/v1/video/jobs/'
            '${Uri.encodeComponent(jobId)}',
          ),
          headers: await _headers(),
        )
        .timeout(AppConfig.requestTimeout);
    if ((response.statusCode < 200 || response.statusCode >= 300) &&
        response.statusCode != 404) {
      final body = _jsonObject(response.body);
      throw _readError(response, body, 'The video could not be deleted.');
    }
  }

  Future<bool> enableReadyNotifications() async {
    if (Firebase.apps.isEmpty || !account.isSignedIn) return false;
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        return false;
      }
      await messaging.setAutoInitEnabled(true);
      if (Platform.isIOS) {
        for (var attempt = 0; attempt < 6; attempt++) {
          if (await messaging.getAPNSToken() != null) break;
          await Future<void>.delayed(const Duration(milliseconds: 350));
        }
      }
      final token = await messaging.getToken();
      if (token == null || token.isEmpty) return false;
      await _registerDeviceToken(token);
      _tokenRefreshSubscription ??= messaging.onTokenRefresh.listen((
        nextToken,
      ) async {
        if (!account.isSignedIn) return;
        try {
          await _registerDeviceToken(nextToken);
        } on Object {
          // A later app open or token refresh retries registration.
        }
      });
      return true;
    } on Object {
      return false;
    }
  }

  Future<void> disableReadyNotifications() async {
    if (Firebase.apps.isEmpty || !account.isSignedIn) return;
    try {
      final messaging = FirebaseMessaging.instance;
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        final response = await _client
            .delete(
              Uri.parse('$_baseUrl/api/mobile/v1/devices'),
              headers: await _headers(includeContentType: true),
              body: jsonEncode({'token': token, 'captchaToken': null}),
            )
            .timeout(AppConfig.requestTimeout);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return;
        }
      }
      await _tokenRefreshSubscription?.cancel();
      _tokenRefreshSubscription = null;
      await messaging.deleteToken();
      await messaging.setAutoInitEnabled(false);
    } on Object {
      // Account sign-out must remain available while offline. A later token
      // registration transaction also moves ownership away from this account.
    }
  }

  Future<void> _registerDeviceToken(String token) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/devices'),
          headers: await _headers(includeContentType: true),
          body: jsonEncode({
            'token': token,
            'platform': Platform.isIOS ? 'ios' : 'android',
            'appVersion': '1.0.0',
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const VideoApiException(
        'Video-ready notifications could not be enabled.',
        code: 'notification_registration_failed',
      );
    }
  }

  Future<Map<String, String>> _headers({
    bool includeContentType = false,
  }) async {
    final token = await account.getIdToken();
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
    _tokenRefreshSubscription?.cancel();
    _client.close();
  }
}

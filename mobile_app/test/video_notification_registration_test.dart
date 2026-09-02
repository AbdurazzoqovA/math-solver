import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/video_lesson_api.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('video-ready notification registration', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('restores an already-authorized registration after restart', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'device-token');
      final requests = <http.Request>[];
      final api = _api(account, messaging, (request) async {
        requests.add(request);
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isTrue);
      expect(messaging.autoInitValues, [isTrue]);
      expect(requests, hasLength(1));
      expect(requests.single.url.path, '/api/mobile/v1/devices');
      expect(requests.single.headers['Authorization'], 'Bearer id:student-a');
      expect(
        jsonDecode(requests.single.body),
        containsPair('appVersion', '1.0.1'),
      );

      expect(await api.restoreReadyNotifications(), isTrue);
      expect(requests, hasLength(1));
    });

    test('a failed restore can retry on the next resume', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'device-token');
      var calls = 0;
      final api = _api(
        account,
        messaging,
        (_) async => http.Response('{}', ++calls == 1 ? 503 : 200),
      );
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isFalse);
      await Future<void>.delayed(Duration.zero);
      expect(await api.restoreReadyNotifications(), isTrue);
      expect(calls, 2);
    });

    test('concurrent restores share one registration request', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'device-token');
      final response = Completer<http.Response>();
      var calls = 0;
      final api = _api(account, messaging, (_) {
        calls += 1;
        return response.future;
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      final first = api.restoreReadyNotifications();
      final second = api.restoreReadyNotifications();
      await _waitFor(() => calls == 1);
      expect(calls, 1);

      response.complete(http.Response('{}', 200));
      expect(await first, isTrue);
      expect(await second, isTrue);
      expect(calls, 1);
    });

    test('token refresh never opts a different account in', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'first-token');
      final requests = <http.Request>[];
      final api = _api(account, messaging, (request) async {
        requests.add(request);
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isTrue);
      account.user = 'student-b';
      messaging.emitToken('rotated-token');
      await _flushEvents();

      expect(requests, hasLength(1));
      expect(requests.single.headers['Authorization'], 'Bearer id:student-a');
    });

    test('token refresh registers a current account that consented', () async {
      _setNotificationConsents(['student-a', 'student-b']);
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'first-token');
      final requests = <http.Request>[];
      final api = _api(account, messaging, (request) async {
        requests.add(request);
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isTrue);
      account.user = 'student-b';
      messaging.emitToken('rotated-token');
      await _waitFor(() => requests.length == 2);

      expect(requests.last.headers['Authorization'], 'Bearer id:student-b');
      expect(
        jsonDecode(requests.last.body),
        containsPair('token', 'rotated-token'),
      );
    });

    test('denied permission and signed-out state do not register', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        permission: ReadyNotificationPermission.denied,
      );
      var calls = 0;
      final api = _api(account, messaging, (_) async {
        calls += 1;
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isFalse);
      account.user = null;
      messaging.permission = ReadyNotificationPermission.authorized;
      expect(await api.restoreReadyNotifications(), isFalse);
      expect(calls, 0);
    });

    test('system permission alone does not silently opt the user in', () async {
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        autoInitEnabled: false,
      );
      var calls = 0;
      final api = _api(account, messaging, (_) async {
        calls += 1;
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isFalse);
      expect(await api.shouldOfferReadyNotifications(), isTrue);
      expect(calls, 0);

      expect(await api.enableReadyNotifications(), isTrue);
      expect(messaging.isAutoInitEnabled, isTrue);
      expect(calls, 1);
    });

    test('disable invalidates a pending notification setup', () async {
      final permission = Completer<ReadyNotificationPermission>();
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        autoInitEnabled: false,
        permissionRequest: permission,
      );
      final requests = <http.Request>[];
      final api = _api(account, messaging, (request) async {
        requests.add(request);
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      final enable = api.enableReadyNotifications();
      await _waitFor(() => messaging.permissionRequestCalls == 1);
      await api.disableReadyNotifications();
      permission.complete(ReadyNotificationPermission.authorized);

      expect(await enable, isFalse);
      expect(requests.where((request) => request.method == 'POST'), isEmpty);
      expect(messaging.isAutoInitEnabled, isFalse);
    });

    test('notification choice is isolated between accounts', () async {
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        autoInitEnabled: false,
      );
      var calls = 0;
      final api = _api(account, messaging, (_) async {
        calls += 1;
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      await api.markReadyNotificationOfferHandled(expectedUserId: 'student-a');
      expect(await api.shouldOfferReadyNotifications(), isFalse);

      account.user = 'student-b';
      expect(await api.shouldOfferReadyNotifications(), isTrue);
      expect(await api.restoreReadyNotifications(), isFalse);
      expect(calls, 0);
    });

    test('one account consent never silently registers another', () async {
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        autoInitEnabled: false,
      );
      var calls = 0;
      final api = _api(account, messaging, (_) async {
        calls += 1;
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(
        await api.enableReadyNotifications(expectedUserId: 'student-a'),
        isTrue,
      );
      expect(calls, 1);

      account.user = 'student-b';
      expect(messaging.isAutoInitEnabled, isTrue);
      expect(await api.restoreReadyNotifications(), isFalse);
      expect(await api.shouldOfferReadyNotifications(), isTrue);
      expect(calls, 1);
    });

    test('account transition invalidates the old local token', () async {
      _setNotificationConsent('student-a');
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'old-token');
      final requests = <http.Request>[];
      final api = _api(account, messaging, (request) async {
        requests.add(request);
        return http.Response('{}', 200);
      });
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      expect(await api.restoreReadyNotifications(), isTrue);
      account.user = 'student-b';
      await api.deactivateReadyNotifications();

      expect(messaging.token, isNull);
      expect(messaging.isAutoInitEnabled, isFalse);
      expect(await api.restoreReadyNotifications(), isFalse);
      expect(
        requests.where((request) => request.method == 'POST'),
        hasLength(1),
      );
      expect(requests.single.headers['Authorization'], 'Bearer id:student-a');
    });

    test(
      'account transition restores a new token only with B consent',
      () async {
        _setNotificationConsents(['student-a', 'student-b']);
        final account = _TestAccount('student-a');
        final messaging = _FakeMessaging(token: 'old-token');
        final requests = <http.Request>[];
        final api = _api(account, messaging, (request) async {
          requests.add(request);
          return http.Response('{}', 200);
        });
        addTearDown(() async {
          api.close();
          account.dispose();
          await messaging.close();
        });

        expect(await api.restoreReadyNotifications(), isTrue);
        account.user = 'student-b';
        await api.deactivateReadyNotifications();
        messaging.token = 'new-token';
        expect(
          await api.restoreReadyNotifications(expectedUserId: 'student-b'),
          isTrue,
        );

        final registrations = requests
            .where((request) => request.method == 'POST')
            .toList(growable: false);
        expect(registrations, hasLength(2));
        expect(
          registrations.last.headers['Authorization'],
          'Bearer id:student-b',
        );
        expect(
          jsonDecode(registrations.last.body),
          containsPair('token', 'new-token'),
        );
      },
    );

    test('account deletion clears only that account notification choice', () async {
      _setNotificationConsents(['student-a', 'student-b']);
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(token: 'device-token');
      final api = _api(
        account,
        messaging,
        (_) async => http.Response('{}', 200),
      );
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      await api.clearReadyNotificationPreferences('student-a');
      final preferences = await SharedPreferences.getInstance();

      expect(
        preferences.getBool(
          'mathsolver.video-ready-notification-consent.user.v2.${_encoded('student-a')}',
        ),
        isNull,
      );
      expect(
        preferences.getBool(
          'mathsolver.video-ready-notification-offer.user.v2.${_encoded('student-a')}',
        ),
        isNull,
      );
      expect(
        preferences.getBool(
          'mathsolver.video-ready-notification-consent.user.v2.${_encoded('student-b')}',
        ),
        isTrue,
      );
      expect(
        preferences.getBool(
          'mathsolver.video-ready-notification-offer.user.v2.${_encoded('student-b')}',
        ),
        isTrue,
      );
    });

    test(
      'saved consent re-enables notifications after sign-out cleanup',
      () async {
        final account = _TestAccount('student-a');
        final messaging = _FakeMessaging(
          token: 'device-token',
          autoInitEnabled: false,
        );
        var calls = 0;
        final api = _api(account, messaging, (_) async {
          calls += 1;
          return http.Response('{}', 200);
        });
        addTearDown(() async {
          api.close();
          account.dispose();
          await messaging.close();
        });

        expect(await api.enableReadyNotifications(), isTrue);
        await api.disableReadyNotifications();
        messaging.token = 'new-device-token';

        expect(messaging.isAutoInitEnabled, isFalse);
        expect(await api.restoreReadyNotifications(), isTrue);
        expect(messaging.isAutoInitEnabled, isTrue);
        expect(calls, 3);
      },
    );

    test(
      'sign-out cleanup stays bounded while the server is offline',
      () async {
        final account = _TestAccount('student-a');
        final messaging = _FakeMessaging(token: 'device-token');
        final never = Completer<http.Response>();
        final api = _api(
          account,
          messaging,
          (_) => never.future,
          disableTimeout: const Duration(milliseconds: 1),
        );
        addTearDown(() async {
          api.close();
          account.dispose();
          await messaging.close();
        });

        await api.disableReadyNotifications();

        expect(messaging.token, isNull);
        expect(messaging.autoInitValues, [isFalse]);
      },
    );

    test('auto-init is disabled even when token deletion fails', () async {
      final account = _TestAccount('student-a');
      final messaging = _FakeMessaging(
        token: 'device-token',
        throwOnDeleteToken: true,
      );
      final api = _api(
        account,
        messaging,
        (_) async => http.Response('{}', 200),
      );
      addTearDown(() async {
        api.close();
        account.dispose();
        await messaging.close();
      });

      await api.disableReadyNotifications();

      expect(messaging.isAutoInitEnabled, isFalse);
      expect(messaging.autoInitValues.last, isFalse);
    });
  });
}

void _setNotificationConsent(String userId) {
  _setNotificationConsents([userId]);
}

void _setNotificationConsents(Iterable<String> userIds) {
  SharedPreferences.setMockInitialValues({
    for (final userId in userIds) ...{
      'mathsolver.video-ready-notification-offer.user.v2.${_encoded(userId)}':
          true,
      'mathsolver.video-ready-notification-consent.user.v2.${_encoded(userId)}':
          true,
    },
  });
}

String _encoded(String userId) =>
    base64Url.encode(utf8.encode(userId)).replaceAll('=', '');

Future<void> _flushEvents() async {
  for (var attempt = 0; attempt < 10; attempt++) {
    await Future<void>.delayed(Duration.zero);
  }
}

VideoLessonApi _api(
  _TestAccount account,
  _FakeMessaging messaging,
  Future<http.Response> Function(http.Request) handler, {
  Duration disableTimeout = const Duration(seconds: 3),
}) => VideoLessonApi(
  account: account,
  baseUrl: 'https://math-solver.test',
  client: MockClient(handler),
  notificationMessaging: messaging,
  appVersion: () async => '1.0.1',
  notificationDisableTimeout: disableTimeout,
);

Future<void> _waitFor(bool Function() condition) async {
  for (var attempt = 0; attempt < 20; attempt++) {
    if (condition()) return;
    await Future<void>.delayed(Duration.zero);
  }
  fail('The expected asynchronous event did not occur.');
}

class _TestAccount extends AccountController {
  _TestAccount(this.user);

  String? user;

  @override
  bool get isSignedIn => user != null;

  @override
  String? get userId => user;

  @override
  Future<String> getIdToken({String? expectedUserId}) async {
    if (user == null || (expectedUserId != null && expectedUserId != user)) {
      throw const AccountException('Account changed.');
    }
    return 'id:$user';
  }
}

class _FakeMessaging implements ReadyNotificationMessaging {
  _FakeMessaging({
    required this.token,
    this.permission = ReadyNotificationPermission.authorized,
    this.autoInitEnabled = true,
    this.throwOnDeleteToken = false,
    this.permissionRequest,
  });

  final _tokens = StreamController<String>.broadcast();
  final List<bool> autoInitValues = [];
  String? token;
  ReadyNotificationPermission permission;
  bool autoInitEnabled;
  final bool throwOnDeleteToken;
  final Completer<ReadyNotificationPermission>? permissionRequest;
  var permissionRequestCalls = 0;

  @override
  bool get isAvailable => true;

  @override
  bool get isAutoInitEnabled => autoInitEnabled;

  @override
  Stream<String> get onTokenRefresh => _tokens.stream;

  @override
  Future<void> deleteToken() async {
    if (throwOnDeleteToken) throw StateError('token store unavailable');
    token = null;
  }

  void emitToken(String value) => _tokens.add(value);

  Future<void> close() => _tokens.close();

  @override
  Future<String?> getApnsToken() async => 'apns-token';

  @override
  Future<ReadyNotificationPermission> getPermission() async => permission;

  @override
  Future<String?> getToken() async => token;

  @override
  Future<ReadyNotificationPermission> requestPermission() async {
    permissionRequestCalls++;
    return permissionRequest?.future ?? permission;
  }

  @override
  Future<void> setAutoInitEnabled(bool enabled) async {
    autoInitValues.add(enabled);
    autoInitEnabled = enabled;
  }
}

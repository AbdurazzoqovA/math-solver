import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';

void main() {
  group('AccountController session restoration', () {
    test('waits for and adopts Firebase restored credentials', () async {
      final auth = _FakeFirebaseAuth();
      final controller = AccountController(auth: auth);
      addTearDown(() async {
        controller.dispose();
        await auth.close();
      });

      final initialization = controller.initialize();
      expect(controller.isReady, isFalse);
      expect(controller.isSignedIn, isFalse);

      final user = _FakeUser(
        uid: 'restored-user',
        email: 'student@example.com',
        emailVerified: true,
      );
      auth.emit(user);
      await initialization;

      expect(controller.isReady, isTrue);
      expect(controller.isSignedIn, isTrue);
      expect(controller.userId, 'restored-user');
      expect(controller.email, 'student@example.com');
      expect(user.reloadCalls, 0);
    });

    test(
      'keeps tracking auth changes after initial signed-out state',
      () async {
        final auth = _FakeFirebaseAuth();
        final controller = AccountController(auth: auth);
        addTearDown(() async {
          controller.dispose();
          await auth.close();
        });

        final initialization = controller.initialize();
        auth.emit(null);
        await initialization;
        expect(controller.isSignedIn, isFalse);

        auth.emit(
          _FakeUser(
            uid: 'later-user',
            email: 'later@example.com',
            emailVerified: true,
          ),
        );
        await _flushEvents();
        expect(controller.isSignedIn, isTrue);
        expect(controller.userId, 'later-user');

        auth.emit(null);
        await _flushEvents();
        expect(controller.isSignedIn, isFalse);
        expect(controller.userId, isNull);
      },
    );

    test(
      'does not discard a restored session on a later stream error',
      () async {
        final auth = _FakeFirebaseAuth();
        final controller = AccountController(auth: auth);
        addTearDown(() async {
          controller.dispose();
          await auth.close();
        });

        final initialization = controller.initialize();
        auth.emit(
          _FakeUser(
            uid: 'offline-user',
            email: 'offline@example.com',
            emailVerified: true,
          ),
        );
        await initialization;

        auth.emitError(StateError('temporary auth stream failure'));
        await _flushEvents();
        expect(controller.isSignedIn, isTrue);
        expect(controller.userId, 'offline-user');
      },
    );

    test('rejects an unverified restored account', () async {
      final auth = _FakeFirebaseAuth();
      final controller = AccountController(auth: auth);
      addTearDown(() async {
        controller.dispose();
        await auth.close();
      });

      final initialization = controller.initialize();
      auth.emit(
        _FakeUser(
          uid: 'unverified-user',
          email: 'unverified@example.com',
          emailVerified: false,
        ),
      );
      await initialization;
      await _flushEvents();

      expect(controller.isReady, isTrue);
      expect(controller.isSignedIn, isFalse);
      expect(controller.userId, isNull);
      expect(auth.signOutCalls, 1);
    });

    test('initialization is idempotent', () async {
      final auth = _FakeFirebaseAuth();
      final controller = AccountController(auth: auth);
      addTearDown(() async {
        controller.dispose();
        await auth.close();
      });

      final first = controller.initialize();
      final second = controller.initialize();
      expect(identical(first, second), isTrue);

      auth.emit(null);
      await Future.wait([first, second]);
      expect(auth.authStateChangesCalls, 1);
    });

    test(
      'finishes safely if the auth stream closes before restoring',
      () async {
        final auth = _FakeFirebaseAuth();
        final controller = AccountController(auth: auth);
        addTearDown(controller.dispose);

        final initialization = controller.initialize();
        await auth.close();
        await initialization.timeout(const Duration(seconds: 1));

        expect(controller.isReady, isTrue);
        expect(controller.isSignedIn, isFalse);
      },
    );
  });
}

Future<void> _flushEvents() => Future<void>.delayed(Duration.zero);

class _FakeFirebaseAuth implements FirebaseAuth {
  final _authStates = StreamController<User?>.broadcast();
  User? _currentUser;
  int authStateChangesCalls = 0;
  int signOutCalls = 0;

  @override
  User? get currentUser => _currentUser;

  @override
  Stream<User?> authStateChanges() {
    authStateChangesCalls += 1;
    return _authStates.stream;
  }

  void emit(User? user) {
    _currentUser = user;
    _authStates.add(user);
  }

  void emitError(Object error) {
    _authStates.addError(error);
  }

  @override
  Future<void> signOut() async {
    signOutCalls += 1;
    emit(null);
  }

  Future<void> close() => _authStates.close();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeUser implements User {
  _FakeUser({
    required this.uid,
    required this.email,
    required this.emailVerified,
  });

  @override
  final String uid;

  @override
  final String? email;

  @override
  final bool emailVerified;

  int reloadCalls = 0;

  @override
  List<UserInfo> get providerData => const [];

  @override
  Future<void> reload() async {
    reloadCalls += 1;
    throw StateError('startup restoration must not depend on reload');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

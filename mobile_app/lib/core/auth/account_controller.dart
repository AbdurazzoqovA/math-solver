import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../config/app_config.dart';
import '../security/mobile_attestation.dart';

class AccountException implements Exception {
  const AccountException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AccountController extends ChangeNotifier {
  AccountController({FirebaseAuth? auth, GoogleSignIn? googleSignIn})
    : _injectedAuth = auth,
      _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final FirebaseAuth? _injectedAuth;
  final GoogleSignIn _googleSignIn;

  String? _email;
  String? _uid;
  bool _isReady = false;
  bool _isBusy = false;
  Future<void>? _googleInitialization;

  FirebaseAuth? get _auth {
    if (_injectedAuth != null) return _injectedAuth;
    if (Firebase.apps.isEmpty) return null;
    return FirebaseAuth.instance;
  }

  bool get isConfigured => MobileAttestation.isConfigured && _auth != null;
  bool get isReady => _isReady;
  bool get isBusy => _isBusy;
  bool get isSignedIn {
    final user = _auth?.currentUser;
    return _uid != null && user != null && user.uid == _uid;
  }

  bool get canSignInWithGoogle {
    if (!isConfigured || AppConfig.googleServerClientId.trim().isEmpty) {
      return false;
    }
    if (Platform.isIOS) {
      return AppConfig.googleIosClientId.trim().isNotEmpty;
    }
    if (Platform.isAndroid) {
      return AppConfig.googleAndroidEnabled;
    }
    return false;
  }

  bool get canSignInWithApple =>
      isConfigured && Platform.isIOS && AppConfig.appleSignInEnabled;

  String? get email => _email;
  String? get userId => _uid;

  Future<void> initialize() async {
    final auth = _auth;
    if (!isConfigured || auth == null) {
      _isReady = true;
      notifyListeners();
      return;
    }

    try {
      final existing = auth.currentUser;
      if (existing != null) {
        await existing.reload();
        final current = auth.currentUser;
        if (current == null || !current.emailVerified) {
          await auth.signOut();
          _clearSession();
        } else {
          _adoptUser(current);
        }
      }
    } on Object {
      _clearSession();
    } finally {
      _isReady = true;
      notifyListeners();
    }
  }

  Future<void> signIn({required String email, required String password}) async {
    final auth = _requireAuth();
    if (_isBusy) return;
    _setBusy(true);
    try {
      final credential = await auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _finishSignIn(auth, credential.user);
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AccountException(_friendlyAuthError(error));
    } on Object {
      throw const AccountException(
        'We could not reach the account service. Check your connection.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<bool> signInWithGoogle() async {
    final auth = _requireAuth();
    if (!canSignInWithGoogle) {
      throw const AccountException(
        'Google sign-in is not configured for this build.',
      );
    }
    if (_isBusy) return false;
    _setBusy(true);
    try {
      await _initializeGoogleSignIn();
      final googleUser = await _googleSignIn.authenticate();
      final idToken = googleUser.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const AccountException(
          'Google did not return a valid sign-in token.',
        );
      }
      final credential = GoogleAuthProvider.credential(idToken: idToken);
      final result = await auth.signInWithCredential(credential);
      await _finishSignIn(auth, result.user);
      return true;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) return false;
      throw AccountException(_friendlyGoogleError(error));
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AccountException(_friendlyAuthError(error));
    } on Object {
      throw const AccountException(
        'Google sign-in could not be completed. Check your connection.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<bool> signInWithApple() async {
    final auth = _requireAuth();
    if (!canSignInWithApple) {
      throw const AccountException(
        'Sign in with Apple is not configured for this build.',
      );
    }
    if (_isBusy) return false;
    _setBusy(true);
    try {
      final provider = AppleAuthProvider()
        ..addScope('email')
        ..addScope('name');
      final result = await auth.signInWithProvider(provider);
      await _finishSignIn(auth, result.user);
      return true;
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      if (_isCancellation(error.code)) return false;
      throw AccountException(_friendlyAuthError(error));
    } on Object {
      throw const AccountException(
        'Sign in with Apple could not be completed. Check your connection.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> createAccount({
    required String email,
    required String password,
  }) async {
    final auth = _requireAuth();
    if (_isBusy) return;
    _setBusy(true);
    try {
      final credential = await auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final user = credential.user;
      if (user == null) {
        throw const AccountException(
          'The account service returned an unreadable response.',
        );
      }
      await user.sendEmailVerification();
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AccountException(_friendlyAuthError(error));
    } on Object {
      throw const AccountException(
        'We could not create the account. Check your connection.',
      );
    } finally {
      await auth.signOut();
      _clearSession();
      _setBusy(false);
    }
  }

  Future<void> resendVerification({
    required String email,
    required String password,
  }) async {
    final auth = _requireAuth();
    if (_isBusy) return;
    _setBusy(true);
    try {
      final credential = await auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final user = credential.user;
      if (user == null) {
        throw const AccountException(
          'The account service returned an unreadable response.',
        );
      }
      if (!user.emailVerified) await user.sendEmailVerification();
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AccountException(_friendlyAuthError(error));
    } on Object {
      throw const AccountException(
        'We could not send the verification email. Try again.',
      );
    } finally {
      await auth.signOut();
      _clearSession();
      _setBusy(false);
    }
  }

  Future<void> sendPasswordReset(String email) async {
    final auth = _requireAuth();
    if (_isBusy) return;
    _setBusy(true);
    try {
      await auth.sendPasswordResetEmail(email: email.trim());
      // Keep the result neutral so the UI never reveals account existence.
    } on FirebaseAuthException catch (error) {
      if (error.code == 'network-request-failed' ||
          error.code == 'too-many-requests') {
        throw AccountException(_friendlyAuthError(error));
      }
      // Firebase can report an unknown user; keep that result private.
    } on Object {
      throw const AccountException(
        'We could not reach the account service. Try again.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> signOut() async {
    final auth = _auth;
    if (auth != null) await auth.signOut();
    if (_googleInitialization != null) {
      try {
        await _googleSignIn.signOut();
      } on Object {
        // Firebase sign-out remains authoritative for the app session.
      }
    }
    _clearSession();
    notifyListeners();
  }

  Future<String> getIdToken() async {
    final user = _auth?.currentUser;
    if (!isSignedIn || user == null) {
      throw const AccountException(
        'Sign in with a verified account to create a private video.',
      );
    }
    try {
      final token = await user.getIdToken();
      if (token == null || token.isEmpty) {
        throw const AccountException(
          'Your session expired. Please sign in again.',
        );
      }
      return token;
    } on AccountException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AccountException(_friendlyAuthError(error));
    }
  }

  Future<void> _finishSignIn(FirebaseAuth auth, User? user) async {
    if (user == null) {
      throw const AccountException(
        'The account service returned an unreadable response.',
      );
    }
    await user.reload();
    final current = auth.currentUser;
    if (current == null) {
      throw const AccountException(
        'The account service returned an unreadable response.',
      );
    }
    if (!current.emailVerified) {
      await auth.signOut();
      _clearSession();
      throw const AccountException(
        'Verify your email first, then sign in again to create private videos.',
      );
    }
    _adoptUser(current);
    notifyListeners();
  }

  Future<void> _initializeGoogleSignIn() {
    return _googleInitialization ??= _googleSignIn.initialize(
      clientId: Platform.isIOS ? AppConfig.googleIosClientId : null,
      serverClientId: AppConfig.googleServerClientId,
    );
  }

  FirebaseAuth _requireAuth() {
    final auth = _auth;
    if (!isConfigured || auth == null) {
      throw const AccountException(
        'Mobile account access is not configured for this build.',
      );
    }
    return auth;
  }

  void _adoptUser(User user) {
    _uid = user.uid;
    _email = user.email;
  }

  void _clearSession() {
    _uid = null;
    _email = null;
  }

  void _setBusy(bool value) {
    _isBusy = value;
    notifyListeners();
  }

  static bool _isCancellation(String code) =>
      code == 'canceled' ||
      code == 'web-context-cancelled' ||
      code == 'popup-closed-by-user';

  static String _friendlyGoogleError(GoogleSignInException error) {
    return switch (error.code) {
      GoogleSignInExceptionCode.clientConfigurationError ||
      GoogleSignInExceptionCode.providerConfigurationError =>
        'Google sign-in needs one more provider configuration step.',
      GoogleSignInExceptionCode.interrupted =>
        'Google sign-in was interrupted. Please try again.',
      _ => 'Google sign-in could not be completed. Please try again.',
    };
  }

  static String _friendlyAuthError(FirebaseAuthException error) {
    return switch (error.code) {
      'invalid-credential' ||
      'wrong-password' ||
      'user-not-found' => 'That email or password is not correct.',
      'too-many-requests' =>
        'Too many attempts. Wait a moment, then try again.',
      'user-disabled' => 'This account has been disabled.',
      'email-already-in-use' => 'An account already exists for that email.',
      'weak-password' => 'Use a stronger password with at least 6 characters.',
      'invalid-email' => 'Enter a valid email address.',
      'network-request-failed' =>
        'We could not reach the account service. Check your connection.',
      'account-exists-with-different-credential' =>
        'An account already exists for this email. Sign in with its original method first.',
      'operation-not-allowed' => 'This sign-in method is not enabled yet.',
      _ => 'Sign-in could not be completed. Please try again.',
    };
  }
}

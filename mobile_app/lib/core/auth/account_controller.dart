import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../security/mobile_attestation.dart';

class AccountException implements Exception {
  const AccountException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AccountController extends ChangeNotifier {
  AccountController({http.Client? client, FlutterSecureStorage? storage})
    : _client = client ?? http.Client(),
      _storage = storage ?? const FlutterSecureStorage();

  static const _refreshTokenKey = 'mathsolver.auth.refresh-token.v1';
  static const _emailKey = 'mathsolver.auth.email.v1';
  static const _uidKey = 'mathsolver.auth.uid.v1';

  final http.Client _client;
  final FlutterSecureStorage _storage;

  String? _email;
  String? _idToken;
  String? _refreshToken;
  String? _uid;
  DateTime? _expiresAt;
  bool _isReady = false;
  bool _isBusy = false;

  bool get isConfigured => AppConfig.firebaseApiKey.trim().isNotEmpty;
  bool get isReady => _isReady;
  bool get isBusy => _isBusy;
  bool get isSignedIn =>
      _refreshToken != null && _email != null && _uid != null;
  String? get email => _email;
  String? get userId => _uid;

  Future<void> initialize() async {
    if (!isConfigured) {
      _isReady = true;
      notifyListeners();
      return;
    }

    try {
      _refreshToken = await _storage.read(key: _refreshTokenKey);
      _email = await _storage.read(key: _emailKey);
      _uid = await _storage.read(key: _uidKey);
      if (_refreshToken != null && _email != null && _uid != null) {
        await _refreshIdToken();
      } else if (_refreshToken != null || _email != null || _uid != null) {
        await _clearStoredSession();
      }
    } on Object {
      _idToken = null;
      _refreshToken = null;
      _email = null;
      _uid = null;
    } finally {
      _isReady = true;
      notifyListeners();
    }
  }

  Future<void> signIn({required String email, required String password}) async {
    if (!isConfigured) {
      throw const AccountException(
        'Mobile account access is not configured for this build.',
      );
    }
    if (_isBusy) {
      return;
    }
    _setBusy(true);
    try {
      final response = await _client
          .post(
            Uri.https(
              'identitytoolkit.googleapis.com',
              '/v1/accounts:signInWithPassword',
              {'key': AppConfig.firebaseApiKey},
            ),
            headers: await MobileAttestation.headers(json: true),
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
              'returnSecureToken': true,
            }),
          )
          .timeout(AppConfig.requestTimeout);
      final body = _jsonObject(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AccountException(_friendlyAuthError(body));
      }

      final idToken = body['idToken'];
      final refreshToken = body['refreshToken'];
      final returnedEmail = body['email'];
      final localId = body['localId'];
      final expiresIn = int.tryParse('${body['expiresIn'] ?? ''}');
      if (idToken is! String ||
          refreshToken is! String ||
          returnedEmail is! String ||
          localId is! String ||
          expiresIn == null) {
        throw const AccountException(
          'The account service returned an unreadable response.',
        );
      }

      final verified = await _isEmailVerified(idToken);
      if (!verified) {
        throw const AccountException(
          'Verify your email first, then sign in again to create private videos.',
        );
      }

      _idToken = idToken;
      _refreshToken = refreshToken;
      _email = returnedEmail;
      _uid = localId;
      _expiresAt = DateTime.now().add(Duration(seconds: expiresIn - 60));
      await Future.wait([
        _storage.write(key: _refreshTokenKey, value: refreshToken),
        _storage.write(key: _emailKey, value: returnedEmail),
        _storage.write(key: _uidKey, value: localId),
      ]);
      notifyListeners();
    } on AccountException {
      rethrow;
    } on Object {
      throw const AccountException(
        'We could not reach the account service. Check your connection.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> createAccount({
    required String email,
    required String password,
  }) async {
    _requireConfiguration();
    if (_isBusy) return;
    _setBusy(true);
    try {
      final response = await _client
          .post(
            Uri.https('identitytoolkit.googleapis.com', '/v1/accounts:signUp', {
              'key': AppConfig.firebaseApiKey,
            }),
            headers: await MobileAttestation.headers(json: true),
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
              'returnSecureToken': true,
            }),
          )
          .timeout(AppConfig.requestTimeout);
      final body = _jsonObject(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AccountException(_friendlyAuthError(body));
      }
      final idToken = body['idToken'];
      if (idToken is! String) {
        throw const AccountException(
          'The account service returned an unreadable response.',
        );
      }
      await _sendVerificationToken(idToken);
    } on AccountException {
      rethrow;
    } on Object {
      throw const AccountException(
        'We could not create the account. Check your connection.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> resendVerification({
    required String email,
    required String password,
  }) async {
    _requireConfiguration();
    if (_isBusy) return;
    _setBusy(true);
    try {
      final response = await _client
          .post(
            Uri.https(
              'identitytoolkit.googleapis.com',
              '/v1/accounts:signInWithPassword',
              {'key': AppConfig.firebaseApiKey},
            ),
            headers: await MobileAttestation.headers(json: true),
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
              'returnSecureToken': true,
            }),
          )
          .timeout(AppConfig.requestTimeout);
      final body = _jsonObject(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AccountException(_friendlyAuthError(body));
      }
      final idToken = body['idToken'];
      if (idToken is! String) {
        throw const AccountException(
          'The account service returned an unreadable response.',
        );
      }
      await _sendVerificationToken(idToken);
    } on AccountException {
      rethrow;
    } on Object {
      throw const AccountException(
        'We could not send the verification email. Try again.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> sendPasswordReset(String email) async {
    _requireConfiguration();
    if (_isBusy) return;
    _setBusy(true);
    try {
      await _client
          .post(
            Uri.https(
              'identitytoolkit.googleapis.com',
              '/v1/accounts:sendOobCode',
              {'key': AppConfig.firebaseApiKey},
            ),
            headers: await MobileAttestation.headers(json: true),
            body: jsonEncode({
              'requestType': 'PASSWORD_RESET',
              'email': email.trim(),
            }),
          )
          .timeout(AppConfig.requestTimeout);
      // Keep the result neutral so the UI never reveals account existence.
    } on Object {
      throw const AccountException(
        'We could not reach the account service. Try again.',
      );
    } finally {
      _setBusy(false);
    }
  }

  Future<void> signOut() async {
    _email = null;
    _idToken = null;
    _refreshToken = null;
    _uid = null;
    _expiresAt = null;
    await _clearStoredSession();
    notifyListeners();
  }

  Future<void> _clearStoredSession() async {
    await Future.wait([
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _emailKey),
      _storage.delete(key: _uidKey),
    ]);
  }

  Future<String> getIdToken() async {
    if (!isSignedIn) {
      throw const AccountException(
        'Sign in with a verified account to create a private video.',
      );
    }
    final expiresAt = _expiresAt;
    if (_idToken == null ||
        expiresAt == null ||
        DateTime.now().isAfter(expiresAt)) {
      await _refreshIdToken();
    }
    final token = _idToken;
    if (token == null) {
      throw const AccountException(
        'Your session expired. Please sign in again.',
      );
    }
    return token;
  }

  Future<bool> _isEmailVerified(String idToken) async {
    final response = await _client
        .post(
          Uri.https('identitytoolkit.googleapis.com', '/v1/accounts:lookup', {
            'key': AppConfig.firebaseApiKey,
          }),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({'idToken': idToken}),
        )
        .timeout(AppConfig.requestTimeout);
    final body = _jsonObject(response.body);
    final users = body['users'];
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        users is! List ||
        users.isEmpty ||
        users.first is! Map) {
      throw const AccountException(
        'We could not verify this account. Please try again.',
      );
    }
    return (users.first as Map)['emailVerified'] == true;
  }

  Future<void> _sendVerificationToken(String idToken) async {
    final response = await _client
        .post(
          Uri.https(
            'identitytoolkit.googleapis.com',
            '/v1/accounts:sendOobCode',
            {'key': AppConfig.firebaseApiKey},
          ),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({'requestType': 'VERIFY_EMAIL', 'idToken': idToken}),
        )
        .timeout(AppConfig.requestTimeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const AccountException(
        'The verification email could not be sent. Try again.',
      );
    }
  }

  void _requireConfiguration() {
    if (!isConfigured) {
      throw const AccountException(
        'Mobile account access is not configured for this build.',
      );
    }
  }

  Future<void> _refreshIdToken() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null) {
      return;
    }
    try {
      final response = await _client
          .post(
            Uri.https('securetoken.googleapis.com', '/v1/token', {
              'key': AppConfig.firebaseApiKey,
            }),
            headers: await MobileAttestation.headers(
              additional: const {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            ),
            body: {
              'grant_type': 'refresh_token',
              'refresh_token': refreshToken,
            },
          )
          .timeout(AppConfig.requestTimeout);
      final body = _jsonObject(response.body);
      final token = body['id_token'];
      final nextRefreshToken = body['refresh_token'];
      final expiresIn = int.tryParse('${body['expires_in'] ?? ''}');
      if (response.statusCode < 200 ||
          response.statusCode >= 300 ||
          token is! String ||
          nextRefreshToken is! String ||
          expiresIn == null) {
        await signOut();
        throw const AccountException(
          'Your session expired. Please sign in again.',
        );
      }
      _idToken = token;
      _refreshToken = nextRefreshToken;
      _expiresAt = DateTime.now().add(Duration(seconds: expiresIn - 60));
      await _storage.write(key: _refreshTokenKey, value: nextRefreshToken);
    } on AccountException {
      rethrow;
    } on Object {
      throw const AccountException(
        'We could not refresh your session. Check your connection.',
      );
    }
  }

  void _setBusy(bool value) {
    _isBusy = value;
    notifyListeners();
  }

  static Map<String, Object?> _jsonObject(String value) {
    try {
      final decoded = jsonDecode(value);
      if (decoded is Map<String, Object?>) {
        return decoded;
      }
    } on FormatException {
      // The caller uses a contextual error.
    }
    return const {};
  }

  static String _friendlyAuthError(Map<String, Object?> body) {
    final error = body['error'];
    if (error is Map) {
      final message = '${error['message'] ?? ''}';
      if (message.contains('INVALID_LOGIN_CREDENTIALS') ||
          message.contains('INVALID_PASSWORD') ||
          message.contains('EMAIL_NOT_FOUND')) {
        return 'That email or password is not correct.';
      }
      if (message.contains('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return 'Too many attempts. Wait a moment, then try again.';
      }
      if (message.contains('USER_DISABLED')) {
        return 'This account has been disabled.';
      }
      if (message.contains('EMAIL_EXISTS')) {
        return 'An account already exists for that email.';
      }
      if (message.contains('WEAK_PASSWORD')) {
        return 'Use a stronger password with at least 6 characters.';
      }
    }
    return 'Sign-in could not be completed. Please try again.';
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }
}

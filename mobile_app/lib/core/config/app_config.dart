import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'MATHSOLVER_API_BASE_URL',
    defaultValue: 'https://math-solver.io',
  );

  static const _legacyFirebaseApiKey = String.fromEnvironment(
    'MATHSOLVER_FIREBASE_API_KEY',
  );

  static const _firebaseIosApiKey = String.fromEnvironment(
    'MATHSOLVER_FIREBASE_IOS_API_KEY',
  );

  static const _firebaseAndroidApiKey = String.fromEnvironment(
    'MATHSOLVER_FIREBASE_ANDROID_API_KEY',
  );

  static String get firebaseApiKey {
    if (defaultTargetPlatform == TargetPlatform.iOS &&
        _firebaseIosApiKey.trim().isNotEmpty) {
      return _firebaseIosApiKey;
    }
    if (defaultTargetPlatform == TargetPlatform.android &&
        _firebaseAndroidApiKey.trim().isNotEmpty) {
      return _firebaseAndroidApiKey;
    }
    return _legacyFirebaseApiKey;
  }

  static const firebaseProjectId = String.fromEnvironment(
    'MATHSOLVER_FIREBASE_PROJECT_ID',
    defaultValue: 'math-solver-e3a55',
  );

  static const firebaseMessagingSenderId = '736102054894';
  static const firebaseStorageBucket = 'math-solver-e3a55.firebasestorage.app';
  static const firebaseIosAppId = '1:736102054894:ios:49c64633630a1e32412cff';
  static const firebaseAndroidAppId =
      '1:736102054894:android:768ac92dba7cb1ac412cff';

  static const requestTimeout = Duration(seconds: 45);
  static const videoPollInterval = Duration(seconds: 3);
  static const maximumUploadBytes = 10 * 1024 * 1024;
}

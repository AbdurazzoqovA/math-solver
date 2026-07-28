import 'dart:io';

import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';

abstract final class MobileAttestation {
  static bool _isReady = false;

  static bool get isConfigured =>
      AppConfig.firebaseApiKey.trim().isNotEmpty &&
      (Platform.isIOS || Platform.isAndroid);

  static Future<void> initialize() async {
    if (!isConfigured) return;

    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: FirebaseOptions(
          apiKey: AppConfig.firebaseApiKey,
          appId: Platform.isIOS
              ? AppConfig.firebaseIosAppId
              : AppConfig.firebaseAndroidAppId,
          messagingSenderId: AppConfig.firebaseMessagingSenderId,
          projectId: AppConfig.firebaseProjectId,
          storageBucket: AppConfig.firebaseStorageBucket,
          iosBundleId: Platform.isIOS ? 'io.mathsolver.app' : null,
        ),
      );
    }
    await FirebaseAppCheck.instance.activate(
      providerAndroid: kReleaseMode
          ? const AndroidPlayIntegrityProvider()
          : const AndroidDebugProvider(),
      providerApple: kReleaseMode
          ? const AppleAppAttestWithDeviceCheckFallbackProvider()
          : const AppleDebugProvider(),
    );
    await FirebaseAppCheck.instance.setTokenAutoRefreshEnabled(true);
    _isReady = true;
  }

  static Future<String?> token() async {
    if (!_isReady) return null;
    try {
      return await FirebaseAppCheck.instance.getToken();
    } on FirebaseException {
      return null;
    }
  }

  static Future<Map<String, String>> headers({
    bool json = false,
    Map<String, String> additional = const {},
  }) async {
    final appCheckToken = await token();
    return {
      ...additional,
      if (json) 'Content-Type': 'application/json',
      if (appCheckToken != null && appCheckToken.isNotEmpty)
        'X-Firebase-AppCheck': appCheckToken,
    };
  }
}

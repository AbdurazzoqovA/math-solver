import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';

enum MobileUpdateAction { none, encourage, required }

class MobileVersionPolicy {
  const MobileVersionPolicy({
    required this.action,
    required this.currentVersion,
    required this.latestVersion,
    required this.minimumSupportedVersion,
    required this.message,
    required this.storeUrl,
  });

  final MobileUpdateAction action;
  final String currentVersion;
  final String latestVersion;
  final String minimumSupportedVersion;
  final String? message;
  final Uri? storeUrl;

  bool get isRequired => action == MobileUpdateAction.required;
  bool get shouldPrompt =>
      action != MobileUpdateAction.none && storeUrl != null;

  factory MobileVersionPolicy.fromJson(Map<String, Object?> value) {
    final action = switch (value['action']) {
      'encourage' => MobileUpdateAction.encourage,
      'required' => MobileUpdateAction.required,
      _ => MobileUpdateAction.none,
    };
    final currentVersion = value['currentVersion'];
    final latestVersion = value['latestVersion'];
    final minimumSupportedVersion = value['minimumSupportedVersion'];
    if (currentVersion is! String ||
        latestVersion is! String ||
        minimumSupportedVersion is! String) {
      throw const FormatException('Invalid mobile version policy');
    }
    final rawUrl = value['storeUrl'];
    final storeUrl = rawUrl is String ? Uri.tryParse(rawUrl) : null;
    return MobileVersionPolicy(
      action: action,
      currentVersion: currentVersion,
      latestVersion: latestVersion,
      minimumSupportedVersion: minimumSupportedVersion,
      message: value['message'] is String ? value['message'] as String : null,
      storeUrl: storeUrl?.scheme == 'https' ? storeUrl : null,
    );
  }

  Map<String, Object?> toJson() => {
    'action': action.name,
    'currentVersion': currentVersion,
    'latestVersion': latestVersion,
    'minimumSupportedVersion': minimumSupportedVersion,
    'message': message,
    'storeUrl': storeUrl?.toString(),
  };
}

class MobileVersionPolicyService {
  MobileVersionPolicyService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? AppConfig.apiBaseUrl).replaceFirst(
        RegExp(r'/$'),
        '',
      );

  static const _cachedRequiredPolicyKey =
      'mathsolver.version-policy.required.v1';
  static const _dismissedOptionalVersionKey =
      'mathsolver.version-policy.dismissed-optional.v1';

  final http.Client _client;
  final String _baseUrl;

  Future<MobileVersionPolicy?> load() async {
    late final PackageInfo info;
    try {
      info = await PackageInfo.fromPlatform();
    } on Object {
      return null;
    }
    final platform = Platform.isIOS ? 'ios' : 'android';
    try {
      final response = await _client
          .get(
            Uri.parse('$_baseUrl/api/mobile/v1/app-config').replace(
              queryParameters: {
                'platform': platform,
                'version': info.version,
                'build': info.buildNumber,
              },
            ),
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return _cachedRequiredPolicy(info.version);
      }
      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, Object?>) {
        return _cachedRequiredPolicy(info.version);
      }
      final policy = MobileVersionPolicy.fromJson(decoded);
      final preferences = await SharedPreferences.getInstance();
      if (policy.isRequired && policy.shouldPrompt) {
        await preferences.setString(
          _cachedRequiredPolicyKey,
          jsonEncode(policy.toJson()),
        );
      } else {
        await preferences.remove(_cachedRequiredPolicyKey);
      }
      return policy;
    } on Object {
      return _cachedRequiredPolicy(info.version);
    }
  }

  Future<MobileVersionPolicy?> _cachedRequiredPolicy(
    String currentVersion,
  ) async {
    final raw = (await SharedPreferences.getInstance()).getString(
      _cachedRequiredPolicyKey,
    );
    if (raw == null) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map<String, Object?>) return null;
      final policy = MobileVersionPolicy.fromJson(value);
      return policy.isRequired &&
              policy.shouldPrompt &&
              policy.currentVersion == currentVersion
          ? policy
          : null;
    } on Object {
      return null;
    }
  }

  Future<bool> wasOptionalUpdateDismissed(String latestVersion) async {
    return (await SharedPreferences.getInstance()).getString(
          _dismissedOptionalVersionKey,
        ) ==
        latestVersion;
  }

  Future<void> dismissOptionalUpdate(String latestVersion) async {
    await (await SharedPreferences.getInstance()).setString(
      _dismissedOptionalVersionKey,
      latestVersion,
    );
  }

  void close() => _client.close();
}

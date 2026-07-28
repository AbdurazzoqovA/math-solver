import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../features/practice/domain/practice_set.dart';
import '../../features/solve/domain/math_review.dart';
import '../config/app_config.dart';
import '../security/mobile_attestation.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class MathSolverApi {
  MathSolverApi({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? AppConfig.apiBaseUrl).replaceAll(
        RegExp(r'/$'),
        '',
      );

  final http.Client _client;
  final String _baseUrl;

  Future<String> extractProblem({
    required Uint8List bytes,
    required String mimeType,
    required String source,
  }) async {
    if (bytes.lengthInBytes > AppConfig.maximumUploadBytes) {
      throw const ApiException('This image is larger than 10 MB.');
    }

    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/ocr'),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({
            'base64': base64Encode(bytes),
            'mimeType': mimeType,
            'source': source,
          }),
        )
        .timeout(AppConfig.requestTimeout);

    final data = _readJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        _readError(
          data,
          'We could not read that problem. Try a clearer photo.',
        ),
        statusCode: response.statusCode,
      );
    }

    final text = data['text'];
    if (text is! String || text.trim().isEmpty) {
      throw const ApiException(
        'No math problem was found. Try moving closer and reducing glare.',
      );
    }
    return text.trim();
  }

  Stream<String> streamSolution({
    required List<Map<String, String>> messages,
    String? source,
  }) async* {
    final request =
        http.Request('POST', Uri.parse('$_baseUrl/api/mobile/v1/solve'))
          ..headers.addAll(await MobileAttestation.headers(json: true))
          ..body = jsonEncode({'messages': messages, 'source': ?source});
    final response = await _client
        .send(request)
        .timeout(AppConfig.requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = await response.stream.bytesToString();
      final data = _readJson(body);
      throw ApiException(
        _readError(data, 'The solver could not start. Please try again.'),
        statusCode: response.statusCode,
      );
    }

    yield* response.stream.transform(utf8.decoder);
  }

  Future<PracticeSet> generatePractice(String topic) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/practice'),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({'topic': topic}),
        )
        .timeout(AppConfig.requestTimeout);
    final data = _readJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        _readError(data, 'Practice is unavailable right now.'),
        statusCode: response.statusCode,
      );
    }

    try {
      return PracticeSet.fromJson(data);
    } on FormatException {
      throw const ApiException(
        'Practice returned an unreadable response. Please try again.',
      );
    }
  }

  Future<WorkCheckResult> checkWork({
    required Uint8List bytes,
    required String mimeType,
  }) async {
    if (bytes.lengthInBytes > AppConfig.maximumUploadBytes) {
      throw const ApiException('This image is larger than 10 MB.');
    }
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/check-work'),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({
            'base64': base64Encode(bytes),
            'mimeType': mimeType,
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    final data = _readJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        _readError(data, 'We could not review that work. Try a clearer photo.'),
        statusCode: response.statusCode,
      );
    }
    try {
      return WorkCheckResult.fromJson(data);
    } on FormatException {
      throw const ApiException(
        'The work review returned an unreadable response. Please retry.',
      );
    }
  }

  Future<SolutionVerification> verifySolution({
    required String problem,
    required String solution,
  }) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/verify'),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({
            'problem': problem,
            'solution': solution,
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    final data = _readJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return SolutionVerification.fromJson(data);
    }
    return SolutionVerification.fromJson(data);
  }

  Future<void> reportSolutionIssue({
    required String category,
    String? reviewStatus,
  }) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/mobile/v1/feedback'),
          headers: await MobileAttestation.headers(json: true),
          body: jsonEncode({
            'category': category,
            'reviewStatus': reviewStatus,
            'client': 'mobile',
            'captchaToken': null,
          }),
        )
        .timeout(AppConfig.requestTimeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const ApiException('The report could not be sent. Try again.');
    }
  }

  void close() => _client.close();

  static Map<String, Object?> _readJson(String body) {
    try {
      final value = jsonDecode(body);
      if (value is Map<String, Object?>) {
        return value;
      }
    } on FormatException {
      // The caller will use a contextual fallback message.
    }
    return const {};
  }

  static String _readError(Map<String, Object?> data, String fallback) {
    final error = data['error'];
    return error is String && error.trim().isNotEmpty ? error : fallback;
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../features/solve/domain/solution_record.dart';
import '../auth/account_controller.dart';
import '../config/app_config.dart';
import '../security/mobile_attestation.dart';

class CloudNotebookSnapshot {
  const CloudNotebookSnapshot({
    required this.solutions,
    required this.deletions,
  });

  final List<SolutionRecord> solutions;
  final Map<String, DateTime> deletions;
}

class CloudNotebookApi {
  CloudNotebookApi({required this.account, http.Client? client})
    : _client = client ?? http.Client();

  final AccountController account;
  final http.Client _client;

  bool get isConfigured =>
      account.isSignedIn && AppConfig.firebaseProjectId.trim().isNotEmpty;

  String get _documentsBase =>
      'https://firestore.googleapis.com/v1/projects/'
      '${Uri.encodeComponent(AppConfig.firebaseProjectId)}/databases/(default)/documents';

  Future<CloudNotebookSnapshot> loadNotebook() async {
    final uid = account.userId;
    if (!isConfigured || uid == null) {
      return const CloudNotebookSnapshot(solutions: [], deletions: {});
    }
    final responses = await Future.wait([
      _client.get(
        Uri.parse(
          '$_documentsBase/users/${Uri.encodeComponent(uid)}/chats?pageSize=100',
        ),
        headers: await _headers(),
      ),
      _client.get(
        Uri.parse(
          '$_documentsBase/users/${Uri.encodeComponent(uid)}/chatDeletions?pageSize=100',
        ),
        headers: await _headers(),
      ),
    ]);
    final solutions = _documents(responses[0])
        .map(_solutionFromDocument)
        .whereType<SolutionRecord>()
        .toList(growable: false);
    final deletions = <String, DateTime>{};
    for (final document in _documents(responses[1])) {
      final name = document['name'];
      final fields = _map(document['fields']);
      final deletedAt = _integer(fields['deletedAt']);
      if (name is String && deletedAt != null) {
        deletions[name.split('/').last] = DateTime.fromMillisecondsSinceEpoch(
          deletedAt,
        );
      }
    }
    return CloudNotebookSnapshot(solutions: solutions, deletions: deletions);
  }

  Future<void> saveSolution(SolutionRecord record) async {
    final uid = account.userId;
    if (!isConfigured || uid == null) return;
    final headers = await _headers(contentType: true);
    final documentUrl =
        '$_documentsBase/users/${Uri.encodeComponent(uid)}/chats/'
        '${Uri.encodeComponent(record.id)}';
    final response = await _client
        .patch(
          Uri.parse(documentUrl),
          headers: headers,
          body: jsonEncode(_solutionDocument(record)),
        )
        .timeout(AppConfig.requestTimeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const CloudNotebookException(
        'Cloud sync could not save a solution.',
      );
    }
    await _client.delete(
      Uri.parse(
        '$_documentsBase/users/${Uri.encodeComponent(uid)}/chatDeletions/'
        '${Uri.encodeComponent(record.id)}',
      ),
      headers: await _headers(),
    );
  }

  Future<void> deleteSolution(String id) async {
    final uid = account.userId;
    if (!isConfigured || uid == null) return;
    final headers = await _headers();
    await _client.delete(
      Uri.parse(
        '$_documentsBase/users/${Uri.encodeComponent(uid)}/chats/'
        '${Uri.encodeComponent(id)}',
      ),
      headers: headers,
    );
    final response = await _client.patch(
      Uri.parse(
        '$_documentsBase/users/${Uri.encodeComponent(uid)}/chatDeletions/'
        '${Uri.encodeComponent(id)}',
      ),
      headers: await _headers(contentType: true),
      body: jsonEncode({
        'fields': {
          'deletedAt': {
            'integerValue': '${DateTime.now().millisecondsSinceEpoch}',
          },
        },
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const CloudNotebookException(
        'Cloud sync could not save the deletion.',
      );
    }
  }

  Future<Map<String, String>> _headers({bool contentType = false}) async =>
      MobileAttestation.headers(
        json: contentType,
        additional: {'Authorization': 'Bearer ${await account.getIdToken()}'},
      );

  static List<Map<String, Object?>> _documents(http.Response response) {
    if (response.statusCode == 404) return const [];
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const CloudNotebookException('Cloud notebook could not be loaded.');
    }
    final value = jsonDecode(response.body);
    if (value is! Map || value['documents'] is! List) return const [];
    return (value['documents'] as List)
        .whereType<Map>()
        .map((item) => item.map((key, value) => MapEntry('$key', value)))
        .toList(growable: false);
  }

  static SolutionRecord? _solutionFromDocument(Map<String, Object?> document) {
    final fields = _map(document['fields']);
    final id = _string(fields['id']);
    final createdAt = _integer(fields['createdAt']);
    final messages = _array(fields['messages']);
    if (id == null || createdAt == null || messages.isEmpty) return null;
    String? problem;
    String? solution;
    for (final raw in messages) {
      final messageFields = _map(_map(raw)['mapValue']);
      final values = _map(messageFields['fields']);
      final role = _string(values['role']);
      final content = _string(values['content']);
      if (role == 'user' && problem == null) problem = content;
      if (role == 'assistant' && content != null) solution = content;
    }
    if (problem == null || solution == null) return null;
    final sourceValue = _string(fields['source']) ?? '';
    final sourceName = sourceValue.startsWith('mobile:')
        ? sourceValue.substring('mobile:'.length)
        : 'typed';
    return SolutionRecord(
      id: id,
      problem: problem,
      solution: solution,
      createdAt: DateTime.fromMillisecondsSinceEpoch(createdAt),
      source: ProblemSource.values.firstWhere(
        (item) => item.name == sourceName,
        orElse: () => ProblemSource.typed,
      ),
    );
  }

  static Map<String, Object?> _solutionDocument(SolutionRecord record) {
    final timestamp = record.createdAt.millisecondsSinceEpoch;
    final title = record.problem.replaceAll(RegExp(r'\s+'), ' ').trim();
    return {
      'fields': {
        'schemaVersion': {'integerValue': '1'},
        'id': {'stringValue': record.id},
        'title': {
          'stringValue': title.length <= 150
              ? title
              : '${title.substring(0, 147)}…',
        },
        'source': {'stringValue': 'mobile:${record.source.name}'},
        'messages': {
          'arrayValue': {
            'values': [
              _messageValue(
                'mobile-${record.id}-question',
                'user',
                record.problem,
              ),
              _messageValue(
                'mobile-${record.id}-solution',
                'assistant',
                record.solution,
              ),
            ],
          },
        },
        'createdAt': {'integerValue': '$timestamp'},
        'updatedAt': {'integerValue': '$timestamp'},
      },
    };
  }

  static Map<String, Object?> _messageValue(
    String id,
    String role,
    String content,
  ) => {
    'mapValue': {
      'fields': {
        'id': {'stringValue': id},
        'role': {'stringValue': role},
        'content': {'stringValue': content},
      },
    },
  };

  static Map<String, Object?> _map(Object? value) {
    if (value is Map) {
      return value.map((key, value) => MapEntry('$key', value));
    }
    return const {};
  }

  static String? _string(Object? value) {
    final map = _map(value);
    return map['stringValue'] is String ? map['stringValue'] as String : null;
  }

  static int? _integer(Object? value) {
    final raw = _map(value)['integerValue'];
    return raw is String ? int.tryParse(raw) : (raw as num?)?.toInt();
  }

  static List<Object?> _array(Object? value) {
    final values = _map(_map(value)['arrayValue'])['values'];
    return values is List ? values : const [];
  }

  void close() => _client.close();
}

class CloudNotebookException implements Exception {
  const CloudNotebookException(this.message);

  final String message;

  @override
  String toString() => message;
}

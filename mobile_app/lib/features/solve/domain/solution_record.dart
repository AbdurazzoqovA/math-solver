enum ProblemSource {
  camera,
  gallery,
  typed,
  followUp;

  String get label => switch (this) {
    camera => 'Camera',
    gallery => 'Photo',
    typed => 'Typed',
    followUp => 'Follow-up',
  };
}

class SolutionRecord {
  const SolutionRecord({
    required this.id,
    required this.problem,
    required this.solution,
    required this.createdAt,
    required this.source,
  });

  final String id;
  final String problem;
  final String solution;
  final DateTime createdAt;
  final ProblemSource source;

  Map<String, Object> toJson() => {
    'id': id,
    'problem': problem,
    'solution': solution,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'source': source.name,
  };

  factory SolutionRecord.fromJson(Map<String, Object?> json) {
    return SolutionRecord(
      id: json['id'] as String,
      problem: json['problem'] as String,
      solution: json['solution'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      source: ProblemSource.values.firstWhere(
        (value) => value.name == json['source'],
        orElse: () => ProblemSource.typed,
      ),
    );
  }
}

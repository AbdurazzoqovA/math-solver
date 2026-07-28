enum WorkCheckStatus {
  correct,
  hasMistake,
  unclear;

  static WorkCheckStatus parse(Object? value) => switch (value) {
    'correct' => WorkCheckStatus.correct,
    'has_mistake' => WorkCheckStatus.hasMistake,
    _ => WorkCheckStatus.unclear,
  };
}

enum WorkLineStatus {
  correct,
  incorrect,
  unclear;

  static WorkLineStatus parse(Object? value) => switch (value) {
    'correct' => WorkLineStatus.correct,
    'incorrect' => WorkLineStatus.incorrect,
    _ => WorkLineStatus.unclear,
  };
}

class WorkCheckLine {
  const WorkCheckLine({
    required this.index,
    required this.transcription,
    required this.status,
    required this.explanation,
    this.correction,
  });

  final int index;
  final String transcription;
  final WorkLineStatus status;
  final String explanation;
  final String? correction;

  factory WorkCheckLine.fromJson(Map<String, Object?> json) => WorkCheckLine(
    index: (json['index'] as num?)?.toInt() ?? 0,
    transcription: json['transcription'] as String? ?? '',
    status: WorkLineStatus.parse(json['status']),
    explanation: json['explanation'] as String? ?? '',
    correction: json['correction'] is String
        ? json['correction'] as String
        : null,
  );
}

class WorkCheckResult {
  const WorkCheckResult({
    required this.status,
    required this.problem,
    required this.summary,
    required this.confidence,
    required this.lines,
    required this.nextHint,
    this.firstMistakeIndex,
    this.correctedResult,
  });

  final WorkCheckStatus status;
  final String problem;
  final String summary;
  final double confidence;
  final List<WorkCheckLine> lines;
  final int? firstMistakeIndex;
  final String nextHint;
  final String? correctedResult;

  WorkCheckLine? get firstMistake {
    final target = firstMistakeIndex;
    if (target == null) return null;
    return lines.where((line) => line.index == target).firstOrNull;
  }

  factory WorkCheckResult.fromJson(Map<String, Object?> json) {
    final rawLines = json['lines'];
    final lines = rawLines is List
        ? rawLines
              .whereType<Map>()
              .map(
                (line) => WorkCheckLine.fromJson(
                  line.map((key, value) => MapEntry('$key', value)),
                ),
              )
              .toList(growable: false)
        : const <WorkCheckLine>[];
    if (lines.isEmpty) {
      throw const FormatException('No handwritten work lines were returned.');
    }
    return WorkCheckResult(
      status: WorkCheckStatus.parse(json['status']),
      problem: json['problem'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      lines: lines,
      firstMistakeIndex: (json['firstMistakeIndex'] as num?)?.toInt(),
      nextHint: json['nextHint'] as String? ?? '',
      correctedResult: json['correctedResult'] is String
          ? json['correctedResult'] as String
          : null,
    );
  }
}

enum SolutionVerificationStatus {
  checked,
  warning,
  inconclusive;

  static SolutionVerificationStatus parse(Object? value) => switch (value) {
    'checked' => SolutionVerificationStatus.checked,
    'warning' => SolutionVerificationStatus.warning,
    _ => SolutionVerificationStatus.inconclusive,
  };
}

class SolutionVerification {
  const SolutionVerification({
    required this.status,
    required this.confidence,
    required this.summary,
    required this.issues,
    this.finalAnswer,
  });

  final SolutionVerificationStatus status;
  final double confidence;
  final String summary;
  final List<String> issues;
  final String? finalAnswer;

  factory SolutionVerification.fromJson(Map<String, Object?> json) {
    return SolutionVerification(
      status: SolutionVerificationStatus.parse(json['status']),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      summary: json['summary'] as String? ?? '',
      finalAnswer: json['finalAnswer'] is String
          ? json['finalAnswer'] as String
          : null,
      issues: (json['issues'] as List<Object?>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
    );
  }
}

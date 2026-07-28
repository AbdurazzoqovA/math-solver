class PracticeQuestion {
  const PracticeQuestion({
    this.id,
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
  });

  final String? id;
  final String question;
  final List<String> options;
  final int correctAnswerIndex;

  factory PracticeQuestion.fromJson(Map<String, Object?> json) {
    final options = (json['options'] as List<Object?>? ?? const [])
        .whereType<String>()
        .toList(growable: false);
    final rawIndex = json['correctAnswerIndex'];
    final correctIndex = rawIndex is int ? rawIndex : -1;
    if (options.length != 4 || correctIndex < 0 || correctIndex >= 4) {
      throw const FormatException('Invalid practice question');
    }

    return PracticeQuestion(
      id: json['id'] as String?,
      question: json['question'] as String? ?? '',
      options: options,
      correctAnswerIndex: correctIndex,
    );
  }

  PracticeQuestion copyWith({String? id}) => PracticeQuestion(
    id: id ?? this.id,
    question: question,
    options: options,
    correctAnswerIndex: correctAnswerIndex,
  );

  Map<String, Object?> toJson() => {
    if (id != null) 'id': id,
    'question': question,
    'options': options,
    'correctAnswerIndex': correctAnswerIndex,
  };
}

class PracticeSet {
  const PracticeSet({required this.title, required this.questions});

  final String title;
  final List<PracticeQuestion> questions;

  factory PracticeSet.fromJson(Map<String, Object?> json) {
    final questions = (json['questions'] as List<Object?>? ?? const [])
        .whereType<Map<String, Object?>>()
        .map(PracticeQuestion.fromJson)
        .toList(growable: false);
    if (questions.length != 4) {
      throw const FormatException('Expected four practice questions');
    }
    return PracticeSet(
      title: json['title'] as String? ?? 'Quick practice',
      questions: questions,
    );
  }
}

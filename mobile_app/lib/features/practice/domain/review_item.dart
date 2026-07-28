import 'practice_set.dart';

const reviewIntervals = [1, 3, 7, 14];

class ReviewItem {
  const ReviewItem({
    required this.id,
    required this.question,
    required this.sourceProblem,
    required this.dueAt,
    required this.intervalDays,
    required this.correctReviews,
    required this.lapses,
    required this.lastReviewedAt,
  });

  final String id;
  final PracticeQuestion question;
  final String sourceProblem;
  final DateTime dueAt;
  final int intervalDays;
  final int correctReviews;
  final int lapses;
  final DateTime lastReviewedAt;

  bool isDue([DateTime? now]) => !dueAt.isAfter(now ?? DateTime.now());

  factory ReviewItem.initial({
    required String id,
    required PracticeQuestion question,
    required String sourceProblem,
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    return ReviewItem(
      id: id,
      question: question.copyWith(id: id),
      sourceProblem: sourceProblem,
      dueAt: _futureDay(current, 1),
      intervalDays: 1,
      correctReviews: 0,
      lapses: 1,
      lastReviewedAt: current,
    );
  }

  ReviewItem schedule({required bool correct, DateTime? now}) {
    final current = now ?? DateTime.now();
    if (!correct) {
      return ReviewItem(
        id: id,
        question: question,
        sourceProblem: sourceProblem,
        dueAt: _futureDay(current, 1),
        intervalDays: 1,
        correctReviews: 0,
        lapses: lapses + 1,
        lastReviewedAt: current,
      );
    }
    final next =
        reviewIntervals.where((days) => days > intervalDays).firstOrNull ??
        reviewIntervals.last;
    return ReviewItem(
      id: id,
      question: question,
      sourceProblem: sourceProblem,
      dueAt: _futureDay(current, next),
      intervalDays: next,
      correctReviews: correctReviews + 1,
      lapses: lapses,
      lastReviewedAt: current,
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'question': question.toJson(),
    'sourceProblem': sourceProblem,
    'dueAt': dueAt.toUtc().toIso8601String(),
    'intervalDays': intervalDays,
    'correctReviews': correctReviews,
    'lapses': lapses,
    'lastReviewedAt': lastReviewedAt.toUtc().toIso8601String(),
  };

  factory ReviewItem.fromJson(Map<String, Object?> json) {
    return ReviewItem(
      id: json['id'] as String,
      question: PracticeQuestion.fromJson(
        (json['question'] as Map).map((key, value) => MapEntry('$key', value)),
      ),
      sourceProblem: json['sourceProblem'] as String? ?? '',
      dueAt: DateTime.parse(json['dueAt'] as String).toLocal(),
      intervalDays: (json['intervalDays'] as num?)?.toInt() ?? 1,
      correctReviews: (json['correctReviews'] as num?)?.toInt() ?? 0,
      lapses: (json['lapses'] as num?)?.toInt() ?? 1,
      lastReviewedAt: DateTime.parse(
        json['lastReviewedAt'] as String,
      ).toLocal(),
    );
  }

  static DateTime _futureDay(DateTime now, int days) {
    return DateTime(now.year, now.month, now.day + days);
  }
}

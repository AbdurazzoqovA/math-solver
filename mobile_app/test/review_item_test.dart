import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/practice/domain/practice_set.dart';
import 'package:mathsolver_mobile/features/practice/domain/review_item.dart';

void main() {
  const question = PracticeQuestion(
    question: r'Solve $2x = 8$.',
    options: [r'$2$', r'$3$', r'$4$', r'$5$'],
    correctAnswerIndex: 2,
  );

  test('mistakes return on the 1, 3, 7, 14 day schedule', () {
    final now = DateTime(2026, 7, 28, 15);
    var item = ReviewItem.initial(
      id: 'review-1',
      question: question,
      sourceProblem: '2x = 8',
      now: now,
    );

    expect(item.dueAt, DateTime(2026, 7, 29));
    item = item.schedule(correct: true, now: now);
    expect(item.intervalDays, 3);
    item = item.schedule(correct: true, now: now);
    expect(item.intervalDays, 7);
    item = item.schedule(correct: true, now: now);
    expect(item.intervalDays, 14);
  });

  test('a repeated mistake resets review to tomorrow', () {
    final now = DateTime(2026, 7, 28, 15);
    var item = ReviewItem.initial(
      id: 'review-1',
      question: question,
      sourceProblem: '2x = 8',
      now: now,
    ).schedule(correct: true, now: now);

    item = item.schedule(correct: false, now: now);
    expect(item.intervalDays, 1);
    expect(item.lapses, 2);
    expect(item.dueAt, DateTime(2026, 7, 29));
  });
}

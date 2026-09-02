import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/practice/domain/practice_set.dart';
import 'package:mathsolver_mobile/features/practice/presentation/quiz_screen.dart';

void main() {
  testWidgets('reports the completed score after the celebration settles', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(800, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    int? completedScore;
    int? completedTotal;
    await tester.pumpWidget(
      MaterialApp(
        home: QuizScreen(
          practice: PracticeSet(
            title: 'Practice',
            questions: List.generate(
              4,
              (index) => PracticeQuestion(
                question: 'Question ${index + 1}',
                options: const ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
                correctAnswerIndex: 0,
              ),
            ),
          ),
          onCompleted: (score, total) async {
            completedScore = score;
            completedTotal = total;
          },
        ),
      ),
    );

    for (var index = 0; index < 4; index++) {
      await tester.tap(find.text('A'));
      await tester.pump();
      await tester.tap(find.text('Check answer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Next question'));
      await tester.pumpAndSettle();
    }
    await tester.pump(const Duration(milliseconds: 901));

    expect(completedScore, 4);
    expect(completedTotal, 4);
    expect(find.text('The idea is landing.'), findsOneWidget);
  });
}

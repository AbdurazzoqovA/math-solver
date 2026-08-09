import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/widgets/math_text.dart';
import 'package:mathsolver_mobile/features/video/domain/video_lesson.dart';
import 'package:mathsolver_mobile/features/video/presentation/video_studio_screen.dart';

void main() {
  test('wraps delimiter-free OCR LaTeX as display math', () {
    const problem = r'\lim_{x \to 3} \left(\frac{x^2 + 9}{x - 3}\right)';

    expect(mathProblemDisplay(problem), r'$$' + problem + r'$$');
  });

  test('keeps ordinary word problems as readable text', () {
    const problem = 'A class has 24 students. One third are absent.';

    expect(mathProblemDisplay(problem), problem);
  });

  test('removes bare LaTeX commands from mixed word problems', () {
    const problem = r'What is \frac{1}{2} + \frac{1}{4}?';

    expect(mathProblemDisplay(problem), 'What is 1/2 + 1/4?');
  });

  test('normalizes parenthesis and bracket LaTeX delimiters', () {
    expect(
      normalizeMathDelimiters(r'Solve \(x^2=4\), then show \[x=\pm2\].'),
      r'Solve $x^2=4$, then show $$x=\pm2$$.',
    );
  });

  testWidgets('does not expose OCR LaTeX commands in the rendered problem', (
    tester,
  ) async {
    const problem = r'\lim_{x \to 3} \left(\frac{x^2 + 9}{x - 3}\right)';

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: MathText(r'$$' + problem + r'$$')),
      ),
    );

    expect(find.textContaining(r'\lim'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('video generation renders its source problem as math', (
    tester,
  ) async {
    const problem = r'\lim_{x \to 3} \left(\frac{x^2 + 9}{x - 3}\right)';

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: VideoGenerationProgress(
            progress: 8,
            label: 'Designing a visual explanation',
            status: VideoJobStatus.planning,
            problem: problem,
          ),
        ),
      ),
    );

    expect(find.textContaining(r'\lim'), findsNothing);
    expect(find.textContaining(r'\frac'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

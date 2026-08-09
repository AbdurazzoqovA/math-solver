import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/widgets/math_text.dart';

void main() {
  test('wraps delimiter-free OCR LaTeX as display math', () {
    const problem = r'\lim_{x \to 3} \left(\frac{x^2 + 9}{x - 3}\right)';

    expect(mathProblemDisplay(problem), r'$$' + problem + r'$$');
  });

  test('keeps ordinary word problems as readable text', () {
    const problem = 'A class has 24 students. One third are absent.';

    expect(mathProblemDisplay(problem), problem);
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
}

import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_parser.dart';

void main() {
  group('SolutionParser', () {
    test('extracts numbered steps and final answer', () {
      const markdown = r'''
---

**Step 1: Isolate the variable**

Subtract $3$ from both sides.

---

**Step 2: Divide**

$$2x = 8$$

**Final Answer**

$$x = 4$$
''';

      final parsed = SolutionParser.parse(markdown);

      expect(parsed.steps, hasLength(2));
      expect(parsed.steps.first.number, 1);
      expect(parsed.steps.first.title, 'Isolate the variable');
      expect(parsed.steps.last.body, contains(r'$$2x = 8$$'));
      expect(parsed.finalAnswer, contains(r'$$x = 4$$'));
    });

    test('falls back to one step for an unstructured response', () {
      final parsed = SolutionParser.parse(r'Use substitution to find $x$.');

      expect(parsed.steps, hasLength(1));
      expect(parsed.steps.first.body, contains('substitution'));
      expect(parsed.finalAnswer, isEmpty);
    });
  });
}

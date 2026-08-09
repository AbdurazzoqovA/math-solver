import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/widgets/text_entry_sheet.dart';

void main() {
  testWidgets('OCR confirmation renders math before exposing editable LaTeX', (
    tester,
  ) async {
    const problem = r'\lim_{x \to 3} \left(\frac{x^2 + 9}{x - 3}\right)';

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TextEntrySheet(
            title: 'Check what we read',
            body: 'Fix a sign or exponent if needed, then solve.',
            initialValue: problem,
            confirmLabel: 'Solve now',
            secondaryLabel: 'Retake',
            autofocus: false,
            showMathPreview: true,
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('recognized-math-preview')), findsOneWidget);
    expect(find.byKey(const Key('text-entry-field')), findsNothing);
    expect(find.textContaining(r'\lim'), findsNothing);

    await tester.tap(find.byKey(const Key('edit-recognized-math')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('text-entry-field')), findsOneWidget);
    expect(find.text('Done editing'), findsOneWidget);
  });
}

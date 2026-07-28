import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/solve/domain/math_review.dart';

void main() {
  test('parses the first incorrect handwritten line', () {
    final result = WorkCheckResult.fromJson({
      'status': 'has_mistake',
      'problem': '2x + 3 = 9',
      'summary': 'The subtraction step changed the wrong sign.',
      'confidence': 0.94,
      'firstMistakeIndex': 1,
      'nextHint': 'Subtract 3 from both sides.',
      'correctedResult': 'x = 3',
      'lines': [
        {
          'index': 0,
          'transcription': '2x + 3 = 9',
          'status': 'correct',
          'explanation': 'This is the original equation.',
          'correction': null,
        },
        {
          'index': 1,
          'transcription': '2x = 12',
          'status': 'incorrect',
          'explanation': 'Subtracting 3 from 9 gives 6.',
          'correction': '2x = 6',
        },
      ],
    });

    expect(result.status, WorkCheckStatus.hasMistake);
    expect(result.firstMistake?.index, 1);
    expect(result.firstMistake?.correction, '2x = 6');
  });

  test('parses an honest inconclusive solution review', () {
    final verification = SolutionVerification.fromJson({
      'status': 'inconclusive',
      'confidence': 0.3,
      'summary': 'The diagram information is incomplete.',
      'finalAnswer': null,
      'issues': ['A required angle label is missing.'],
    });

    expect(verification.status, SolutionVerificationStatus.inconclusive);
    expect(verification.issues, hasLength(1));
  });
}

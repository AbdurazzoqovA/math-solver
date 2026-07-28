class SolutionStep {
  const SolutionStep({
    required this.number,
    required this.title,
    required this.body,
  });

  final int number;
  final String title;
  final String body;
}

class ParsedSolution {
  const ParsedSolution({required this.steps, required this.finalAnswer});

  final List<SolutionStep> steps;
  final String finalAnswer;

  bool get isEmpty => steps.isEmpty && finalAnswer.trim().isEmpty;
}

abstract final class SolutionParser {
  static final _stepHeader = RegExp(
    r'\*\*Step\s+(\d+)\s*:\s*([^*]+)\*\*',
    caseSensitive: false,
  );
  static final _finalHeader = RegExp(
    r'\*\*Final Answer\*\*',
    caseSensitive: false,
  );

  static ParsedSolution parse(String markdown) {
    final normalized = markdown
        .replaceAll(r'\(', r'$')
        .replaceAll(r'\)', r'$')
        .replaceAll(r'\[', r'$$')
        .replaceAll(r'\]', r'$$');
    final matches = _stepHeader.allMatches(normalized).toList();
    final steps = <SolutionStep>[];

    for (var index = 0; index < matches.length; index++) {
      final match = matches[index];
      final nextStart = index + 1 < matches.length
          ? matches[index + 1].start
          : normalized.length;
      var body = normalized.substring(match.end, nextStart);
      final finalMatch = _finalHeader.firstMatch(body);
      if (finalMatch != null) {
        body = body.substring(0, finalMatch.start);
      }
      steps.add(
        SolutionStep(
          number: int.tryParse(match.group(1) ?? '') ?? index + 1,
          title: (match.group(2) ?? 'Work through the next idea').trim(),
          body: _clean(body),
        ),
      );
    }

    final finalMatch = _finalHeader.firstMatch(normalized);
    final finalAnswer = finalMatch == null
        ? ''
        : _clean(normalized.substring(finalMatch.end));

    if (steps.isEmpty && normalized.trim().isNotEmpty) {
      return ParsedSolution(
        steps: [
          SolutionStep(
            number: 1,
            title: 'Work through the solution',
            body: _clean(
              finalMatch == null
                  ? normalized
                  : normalized.substring(0, finalMatch.start),
            ),
          ),
        ],
        finalAnswer: finalAnswer,
      );
    }

    return ParsedSolution(steps: steps, finalAnswer: finalAnswer);
  }

  static String _clean(String value) {
    return value
        .replaceAll(RegExp(r'^\s*---\s*$', multiLine: true), '')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }
}

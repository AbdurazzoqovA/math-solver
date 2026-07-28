import 'package:flutter/material.dart';

import '../../../core/widgets/math_text.dart';
import '../domain/practice_set.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({
    super.key,
    required this.practice,
    this.onAnswered,
    this.reviewMode = false,
  });

  final PracticeSet practice;
  final Future<void> Function(PracticeQuestion question, bool correct)?
  onAnswered;
  final bool reviewMode;

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  var _questionIndex = 0;
  var _score = 0;
  var _selectedIndex = -1;
  var _hasChecked = false;
  var _isComplete = false;

  PracticeQuestion get _question => widget.practice.questions[_questionIndex];

  void _checkAnswer() {
    if (_selectedIndex < 0 || _hasChecked) {
      return;
    }
    final correct = _selectedIndex == _question.correctAnswerIndex;
    setState(() {
      _hasChecked = true;
      if (correct) {
        _score++;
      }
    });
    widget.onAnswered?.call(_question, correct);
  }

  void _next() {
    if (_questionIndex == widget.practice.questions.length - 1) {
      setState(() => _isComplete = true);
      return;
    }
    setState(() {
      _questionIndex++;
      _selectedIndex = -1;
      _hasChecked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.practice.title),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 18),
            child: Center(
              child: Text(
                _isComplete
                    ? 'Done'
                    : '${_questionIndex + 1} of ${widget.practice.questions.length}',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 240),
              child: _isComplete
                  ? _Completion(
                      key: const ValueKey('complete'),
                      score: _score,
                      total: widget.practice.questions.length,
                      onDone: () => Navigator.pop(context),
                    )
                  : _QuestionView(
                      key: ValueKey(_questionIndex),
                      question: _question,
                      selectedIndex: _selectedIndex,
                      hasChecked: _hasChecked,
                      onSelected: (index) {
                        if (!_hasChecked) {
                          setState(() => _selectedIndex = index);
                        }
                      },
                      onPrimary: _hasChecked ? _next : _checkAnswer,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({
    super.key,
    required this.question,
    required this.selectedIndex,
    required this.hasChecked,
    required this.onSelected,
    required this.onPrimary,
  });

  final PracticeQuestion question;
  final int selectedIndex;
  final bool hasChecked;
  final ValueChanged<int> onSelected;
  final VoidCallback onPrimary;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final isCorrect =
        hasChecked && selectedIndex == question.correctAnswerIndex;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LinearProgressIndicator(
            value: hasChecked ? 1 : 0.5,
            minHeight: 5,
            borderRadius: BorderRadius.circular(99),
            backgroundColor: colors.surfaceContainerHighest,
          ),
          const SizedBox(height: 28),
          Text(
            'Try it without looking back.',
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: colors.primary),
          ),
          const SizedBox(height: 10),
          MathText(
            question.question,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontSize: 23, height: 1.35),
          ),
          const SizedBox(height: 24),
          for (var index = 0; index < question.options.length; index++) ...[
            _AnswerOption(
              label: String.fromCharCode(65 + index),
              value: question.options[index],
              isSelected: selectedIndex == index,
              isCorrect: hasChecked && index == question.correctAnswerIndex,
              isIncorrect:
                  hasChecked &&
                  selectedIndex == index &&
                  index != question.correctAnswerIndex,
              onTap: () => onSelected(index),
            ),
            const SizedBox(height: 10),
          ],
          if (hasChecked) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isCorrect
                    ? colors.primaryContainer
                    : colors.errorContainer,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isCorrect
                        ? Icons.check_circle_outline_rounded
                        : Icons.lightbulb_outline_rounded,
                    color: isCorrect
                        ? colors.onPrimaryContainer
                        : colors.onErrorContainer,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      isCorrect
                          ? 'Correct. You can move on.'
                          : 'Not yet. Notice what changes in the highlighted answer.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: isCorrect
                            ? colors.onPrimaryContainer
                            : colors.onErrorContainer,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const Spacer(),
          FilledButton(
            onPressed: selectedIndex < 0 ? null : onPrimary,
            child: Text(hasChecked ? 'Next question' : 'Check answer'),
          ),
        ],
      ),
    );
  }
}

class _AnswerOption extends StatelessWidget {
  const _AnswerOption({
    required this.label,
    required this.value,
    required this.isSelected,
    required this.isCorrect,
    required this.isIncorrect,
    required this.onTap,
  });

  final String label;
  final String value;
  final bool isSelected;
  final bool isCorrect;
  final bool isIncorrect;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final background = isCorrect
        ? colors.primaryContainer
        : isIncorrect
        ? colors.errorContainer
        : isSelected
        ? colors.secondaryContainer
        : colors.surfaceContainerLow;
    final border = isCorrect
        ? colors.primary
        : isIncorrect
        ? colors.error
        : isSelected
        ? colors.secondary
        : colors.outlineVariant;

    return Semantics(
      button: true,
      selected: isSelected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: border, width: isSelected ? 2 : 1),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: colors.surface.withValues(alpha: 0.72),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(child: MathText(value)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Completion extends StatelessWidget {
  const _Completion({
    super.key,
    required this.score,
    required this.total,
    required this.onDone,
  });

  final int score;
  final int total;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 112,
            height: 112,
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: BorderRadius.circular(32),
            ),
            alignment: Alignment.center,
            child: Text(
              '$score/$total',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: colors.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(height: 28),
          Text(
            score == total ? 'The idea is landing.' : 'Good practice.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 10),
          Text(
            score == total
                ? 'You answered every question correctly.'
                : 'Mistakes show exactly what to review next.',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 30),
          FilledButton(onPressed: onDone, child: const Text('Finish')),
        ],
      ),
    );
  }
}

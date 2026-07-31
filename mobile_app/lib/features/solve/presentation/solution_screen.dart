import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/auth/account_controller.dart';
import '../../../core/network/mathsolver_api.dart';
import '../../../core/network/video_lesson_api.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/math_text.dart';
import '../../../core/widgets/text_entry_sheet.dart';
import '../../app/app_controller.dart';
import '../../practice/presentation/quiz_screen.dart';
import '../../video/presentation/video_studio_screen.dart';
import '../domain/math_review.dart';
import '../domain/solution_parser.dart';
import '../domain/solution_record.dart';

enum _SolveStatus { loading, streaming, ready, error }

class SolutionScreen extends StatefulWidget {
  const SolutionScreen({
    super.key,
    required this.problem,
    required this.source,
    required this.controller,
    required this.api,
    required this.account,
    required this.videoApi,
    this.priorMessages,
    this.saveToNotebook = true,
    this.initialSolution,
    this.existingRecordId,
  });

  final String problem;
  final ProblemSource source;
  final AppController controller;
  final MathSolverApi api;
  final AccountController account;
  final VideoLessonApi videoApi;
  final List<Map<String, String>>? priorMessages;
  final bool saveToNotebook;
  final String? initialSolution;
  final String? existingRecordId;

  @override
  State<SolutionScreen> createState() => _SolutionScreenState();
}

class _SolutionScreenState extends State<SolutionScreen> {
  var _status = _SolveStatus.loading;
  var _rawSolution = '';
  var _revealedSteps = 1;
  String? _error;
  var _isCreatingPractice = false;
  var _isVerifying = false;
  SolutionVerification? _verification;
  var _requestGeneration = 0;
  late final String _recordId;

  @override
  void initState() {
    super.initState();
    _recordId =
        widget.existingRecordId ??
        DateTime.now().microsecondsSinceEpoch.toString();
    final initialSolution = widget.initialSolution;
    if (initialSolution != null) {
      _rawSolution = initialSolution;
      _status = _SolveStatus.ready;
      if (!widget.controller.learningMode) {
        _revealedSteps = SolutionParser.parse(_rawSolution).steps.length;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) => _verifySolution());
    } else {
      _solve();
    }
  }

  @override
  void dispose() {
    _requestGeneration++;
    super.dispose();
  }

  Future<void> _solve() async {
    final generation = ++_requestGeneration;
    setState(() {
      _status = _SolveStatus.loading;
      _rawSolution = '';
      _error = null;
      _revealedSteps = 1;
    });

    final messages =
        widget.priorMessages ??
        [
          {'role': 'user', 'content': widget.problem},
        ];
    try {
      await for (final chunk in widget.api.streamSolution(messages: messages)) {
        if (!mounted || generation != _requestGeneration) {
          return;
        }
        setState(() {
          _status = _SolveStatus.streaming;
          _rawSolution += chunk;
        });
      }
      if (!mounted || generation != _requestGeneration) {
        return;
      }
      setState(() => _status = _SolveStatus.ready);
      if (!widget.controller.learningMode) {
        _revealedSteps = SolutionParser.parse(_rawSolution).steps.length;
      }
      if (widget.saveToNotebook) {
        await widget.controller.addSolution(
          SolutionRecord(
            id: _recordId,
            problem: widget.problem,
            solution: _rawSolution,
            createdAt: DateTime.now(),
            source: widget.source,
          ),
        );
      }
      await _verifySolution();
    } on ApiException catch (error) {
      if (mounted && generation == _requestGeneration) {
        setState(() {
          _status = _SolveStatus.error;
          _error = error.message;
        });
      }
    } on TimeoutException {
      if (mounted && generation == _requestGeneration) {
        setState(() {
          _status = _SolveStatus.error;
          _error = 'The solver took too long to respond. Please try again.';
        });
      }
    } on Object {
      if (mounted && generation == _requestGeneration) {
        setState(() {
          _status = _SolveStatus.error;
          _error = 'The connection was interrupted. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final parsed = SolutionParser.parse(_rawSolution);
    final visibleCount = widget.controller.learningMode
        ? _revealedSteps.clamp(0, parsed.steps.length)
        : parsed.steps.length;
    final canRevealMore = visibleCount < parsed.steps.length;
    final showFinal =
        _status == _SolveStatus.ready &&
        !canRevealMore &&
        parsed.finalAnswer.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your solution'),
        actions: [
          if (_status == _SolveStatus.ready)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: _VerificationBadge(
                  isLoading: _isVerifying,
                  verification: _verification,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
                  sliver: SliverList.list(
                    children: [
                      _ProblemHeader(problem: widget.problem),
                      const SizedBox(height: 18),
                      if (widget.controller.learningMode)
                        _LearningModeNotice(
                          onShowAll: parsed.steps.isEmpty
                              ? null
                              : () {
                                  setState(
                                    () => _revealedSteps = parsed.steps.length,
                                  );
                                },
                        ),
                      if (widget.controller.learningMode)
                        const SizedBox(height: 18),
                      if (_status == _SolveStatus.loading ||
                          (_status == _SolveStatus.streaming &&
                              parsed.steps.isEmpty))
                        const _SolutionSkeleton(),
                      if (_status == _SolveStatus.error)
                        _ErrorState(
                          message: _error ?? 'The solver could not respond.',
                          onRetry: _solve,
                        ),
                      for (var index = 0; index < visibleCount; index++) ...[
                        _EnterAnimation(
                          key: ValueKey('step-$index'),
                          child: _StepCard(step: parsed.steps[index]),
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (_status == _SolveStatus.streaming &&
                          parsed.steps.isNotEmpty)
                        const _StreamingTail(),
                      if (canRevealMore && _status == _SolveStatus.ready) ...[
                        const SizedBox(height: 8),
                        FilledButton.icon(
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            setState(() => _revealedSteps++);
                          },
                          icon: const Icon(Icons.arrow_downward_rounded),
                          label: Text(
                            visibleCount == 0
                                ? 'Reveal first step'
                                : 'Reveal next step',
                          ),
                        ),
                      ],
                      if (showFinal) ...[
                        const SizedBox(height: 10),
                        _EnterAnimation(
                          key: const ValueKey('final-answer'),
                          child: _FinalAnswer(answer: parsed.finalAnswer),
                        ),
                      ],
                      if (_verification != null) ...[
                        const SizedBox(height: 14),
                        _EnterAnimation(
                          key: const ValueKey('verification'),
                          child: _VerificationCard(verification: _verification!),
                        ),
                      ],
                      if (_status == _SolveStatus.ready) ...[
                        const SizedBox(height: 18),
                        TextButton.icon(
                          onPressed: _reportIssue,
                          icon: const Icon(Icons.flag_outlined, size: 18),
                          label: const Text('Report a wrong answer'),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: _status == _SolveStatus.ready
          ? SafeArea(
              minimum: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              child: _SolutionActionDock(
                isCreatingPractice: _isCreatingPractice,
                onVideo: _openVideoStudio,
                onPractice: _openPractice,
                onAsk: _askFollowUp,
              ),
            )
          : null,
    );
  }

  Future<void> _openPractice() async {
    if (_isCreatingPractice) {
      return;
    }
    setState(() => _isCreatingPractice = true);
    try {
      final practice = await widget.api.generatePractice(
        '${widget.problem}\n\n$_rawSolution',
      );
      if (mounted) {
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (context) => QuizScreen(
              practice: practice,
              onAnswered: (question, correct) =>
                  widget.controller.recordPracticeAnswer(
                    question: question,
                    correct: correct,
                    sourceProblem: widget.problem,
                  ),
            ),
          ),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingPractice = false);
      }
    }
  }

  Future<void> _verifySolution() async {
    if (_rawSolution.trim().isEmpty || _isVerifying) return;
    setState(() => _isVerifying = true);
    try {
      final verification = await widget.api.verifySolution(
        problem: widget.problem,
        solution: _rawSolution,
      );
      if (mounted) setState(() => _verification = verification);
    } on Object {
      if (mounted) {
        setState(
          () => _verification = const SolutionVerification(
            status: SolutionVerificationStatus.inconclusive,
            confidence: 0,
            summary: 'The independent AI review is unavailable right now.',
            issues: [],
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _reportIssue() async {
    final category = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (context) => const _IssueSheet(),
    );
    if (category == null || !mounted) return;
    try {
      await widget.api.reportSolutionIssue(
        category: category,
        reviewStatus: _verification?.status.name,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Report received. No problem text or identity was sent.',
            ),
          ),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _openVideoStudio() {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: widget.account,
          api: widget.videoApi,
          problem: widget.problem,
          solution: _rawSolution,
          requestKey: 'mobile-$_recordId',
        ),
      ),
    );
  }

  Future<void> _askFollowUp() async {
    final followUp = await showTextEntrySheet(
      context,
      title: 'Ask about this solution',
      confirmLabel: 'Ask',
      hintText: 'Why did the sign change in step 2?',
      maxLines: 3,
    );
    if (followUp == null || !mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SolutionScreen(
          problem: followUp,
          source: ProblemSource.followUp,
          controller: widget.controller,
          api: widget.api,
          account: widget.account,
          videoApi: widget.videoApi,
          saveToNotebook: false,
          priorMessages: [
            {'role': 'user', 'content': widget.problem},
            {'role': 'assistant', 'content': _rawSolution},
            {'role': 'user', 'content': followUp},
          ],
        ),
      ),
    );
  }
}

class _EnterAnimation extends StatelessWidget {
  const _EnterAnimation({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 340),
      curve: Curves.easeOutCubic,
      child: child,
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, 14 * (1 - value)),
          child: child,
        ),
      ),
    );
  }
}

class _VerificationBadge extends StatelessWidget {
  const _VerificationBadge({
    required this.isLoading,
    required this.verification,
  });

  final bool isLoading;
  final SolutionVerification? verification;

  @override
  Widget build(BuildContext context) {
    final item = verification;
    final label = isLoading
        ? 'CHECKING'
        : switch (item?.status) {
            SolutionVerificationStatus.checked => 'AI CHECKED',
            SolutionVerificationStatus.warning => 'REVIEW',
            SolutionVerificationStatus.inconclusive => 'UNCERTAIN',
            null => 'READY',
          };
    final background = switch (item?.status) {
      SolutionVerificationStatus.warning => Theme.of(
        context,
      ).colorScheme.errorContainer,
      SolutionVerificationStatus.inconclusive => Theme.of(
        context,
      ).colorScheme.surfaceContainerHigh,
      _ => AppTheme.mint,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isLoading)
            const SizedBox.square(
              dimension: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(
              item?.status == SolutionVerificationStatus.warning
                  ? Icons.priority_high_rounded
                  : Icons.fact_check_outlined,
              size: 16,
              color: AppTheme.ink,
            ),
          const SizedBox(width: 5),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppTheme.ink,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationCard extends StatelessWidget {
  const _VerificationCard({required this.verification});

  final SolutionVerification verification;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final isWarning = verification.status == SolutionVerificationStatus.warning;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: isWarning ? colors.errorContainer : colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isWarning
                    ? Icons.warning_amber_rounded
                    : Icons.fact_check_outlined,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Independent AI review',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const Spacer(),
              Text(
                '${(verification.confidence * 100).round()}%',
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(verification.summary),
          for (final issue in verification.issues) ...[
            const SizedBox(height: 6),
            Text('• $issue'),
          ],
          const SizedBox(height: 8),
          Text(
            'AI review is a second opinion, not a formal proof.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _IssueSheet extends StatelessWidget {
  const _IssueSheet();

  static const _items = [
    ('wrong_answer', Icons.calculate_outlined, 'The answer is wrong'),
    ('unclear_step', Icons.route_outlined, 'A step is unclear'),
    ('formatting', Icons.functions_outlined, 'Math formatting is broken'),
    ('ocr_mismatch', Icons.document_scanner_outlined, 'The scan was misread'),
    ('other', Icons.more_horiz_rounded, 'Something else'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What should we improve?',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 6),
          Text(
            'Only the category is sent—never your math or account.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 14),
          for (final item in _items)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(item.$2),
              title: Text(item.$3),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => Navigator.pop(context, item.$1),
            ),
        ],
      ),
    );
  }
}

class SolutionContent extends StatelessWidget {
  const SolutionContent({super.key, required this.solution});

  final String solution;

  @override
  Widget build(BuildContext context) {
    final parsed = SolutionParser.parse(solution);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final step in parsed.steps) ...[
          _StepCard(step: step),
          const SizedBox(height: 12),
        ],
        if (parsed.finalAnswer.isNotEmpty)
          _FinalAnswer(answer: parsed.finalAnswer),
      ],
    );
  }
}

class _ProblemHeader extends StatelessWidget {
  const _ProblemHeader({required this.problem});

  final String problem;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your problem',
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: colors.primary),
          ),
          const SizedBox(height: 9),
          MathText(problem, style: Theme.of(context).textTheme.titleLarge),
        ],
      ),
    );
  }
}

class _LearningModeNotice extends StatelessWidget {
  const _LearningModeNotice({required this.onShowAll});

  final VoidCallback? onShowAll;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.school_outlined, size: 20, color: colors.primary),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            'Learning mode reveals one step at a time.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        TextButton(onPressed: onShowAll, child: const Text('Show all')),
      ],
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.step});

  final SolutionStep step;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: colors.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${step.number}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: colors.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      step.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (step.body.isNotEmpty) ...[
              const SizedBox(height: 15),
              MathText(step.body),
            ],
          ],
        ),
      ),
    );
  }
}

class _FinalAnswer extends StatelessWidget {
  const _FinalAnswer({required this.answer});

  final String answer;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.check_circle_outline_rounded,
                color: colors.onPrimaryContainer,
              ),
              const SizedBox(width: 9),
              Text(
                'Final answer',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: colors.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          MathText(
            answer,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(color: colors.onPrimaryContainer),
          ),
        ],
      ),
    );
  }
}

class _SolutionActionDock extends StatelessWidget {
  const _SolutionActionDock({
    required this.isCreatingPractice,
    required this.onVideo,
    required this.onPractice,
    required this.onAsk,
  });

  final bool isCreatingPractice;
  final VoidCallback onVideo;
  final VoidCallback onPractice;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.ink.withValues(alpha: 0.11),
            blurRadius: 24,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: FilledButton.icon(
              onPressed: onVideo,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Watch'),
            ),
          ),
          const SizedBox(width: 7),
          Expanded(
            flex: 4,
            child: FilledButton.tonalIcon(
              onPressed: isCreatingPractice ? null : onPractice,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              icon: isCreatingPractice
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.bolt_rounded),
              label: const Text('Try it'),
            ),
          ),
          const SizedBox(width: 7),
          IconButton(
            tooltip: 'Ask a follow-up',
            onPressed: onAsk,
            style: IconButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.surfaceContainer,
              minimumSize: const Size(52, 52),
            ),
            icon: const Icon(Icons.chat_bubble_outline_rounded),
          ),
        ],
      ),
    );
  }
}

class _SolutionSkeleton extends StatelessWidget {
  const _SolutionSkeleton();

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: _SkeletonLine(color: color, width: 180)),
              ],
            ),
            const SizedBox(height: 20),
            _SkeletonLine(color: color),
            const SizedBox(height: 9),
            _SkeletonLine(color: color, width: 230),
            const SizedBox(height: 18),
            const LinearProgressIndicator(minHeight: 3),
          ],
        ),
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.color, this.width = double.infinity});

  final Color color;
  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 13,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(99),
      ),
    );
  }
}

class _StreamingTail extends StatelessWidget {
  const _StreamingTail();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(width: 10),
          const Text('Writing the next step...'),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.errorContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.cloud_off_outlined, color: colors.onErrorContainer),
          const SizedBox(height: 12),
          Text(
            'We lost the connection',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(color: colors.onErrorContainer),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: colors.onErrorContainer),
          ),
          const SizedBox(height: 16),
          FilledButton.tonal(
            onPressed: onRetry,
            child: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}

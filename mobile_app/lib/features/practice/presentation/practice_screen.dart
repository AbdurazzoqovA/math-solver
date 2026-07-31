import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/analytics/mobile_analytics.dart';
import '../../../core/network/mathsolver_api.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/screen_layout.dart';
import '../../app/app_controller.dart';
import '../domain/practice_set.dart';
import 'quiz_screen.dart';

class PracticeScreen extends StatefulWidget {
  const PracticeScreen({
    super.key,
    required this.controller,
    required this.api,
    required this.onOpenProfile,
  });

  final AppController controller;
  final MathSolverApi api;
  final VoidCallback onOpenProfile;

  @override
  State<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends State<PracticeScreen> {
  var _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final latest = widget.controller.latestSolution;
    final solvedToday = widget.controller.solvedToday;
    final goalProgress = (solvedToday / 2).clamp(0.0, 1.0);
    final dueReviews = widget.controller.dueReviewItems;
    final nextReviewAt = widget.controller.nextReviewAt;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: ScreenLayout(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Practice',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Two minutes to make it stick.',
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(color: colors.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Profile and settings',
                      onPressed: widget.onOpenProfile,
                      style: IconButton.styleFrom(
                        backgroundColor: colors.surfaceContainerLow,
                      ),
                      icon: const Icon(Icons.person_outline_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppTheme.mintCard(colors),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.wb_sunny_outlined,
                            color: AppTheme.onMintCard(colors),
                          ),
                          const SizedBox(width: 9),
                          Text(
                            'Daily warm-up',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: AppTheme.onMintCard(colors),
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        latest == null
                            ? 'Solve one problem first. We will build practice around the exact idea.'
                            : dueReviews.isEmpty
                            ? 'Four quick questions based on your latest solution.'
                            : '${dueReviews.length} due review${dueReviews.length == 1 ? '' : 's'} plus fresh practice.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppTheme.onMintCard(colors),
                        ),
                      ),
                      const SizedBox(height: 18),
                      FilledButton(
                        onPressed: latest == null || _isLoading
                            ? null
                            : _startPractice,
                        style: FilledButton.styleFrom(
                          backgroundColor:
                              colors.brightness == Brightness.dark
                              ? AppTheme.mint
                              : AppTheme.ink,
                          foregroundColor:
                              colors.brightness == Brightness.dark
                              ? AppTheme.ink
                              : Colors.white,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Start warm-up'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                Text('Today', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$solvedToday of 2 problems',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 7),
                              Text(
                                solvedToday >= 2
                                    ? 'Daily goal complete.'
                                    : 'A quiet goal, no pressure.',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(color: colors.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: 54,
                          height: 54,
                          child: CircularProgressIndicator(
                            value: goalProgress,
                            strokeWidth: 6,
                            strokeCap: StrokeCap.round,
                            backgroundColor: colors.surfaceContainerHighest,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Text(
                  'Mistake review',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.event_available_outlined,
                          color: colors.primary,
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                dueReviews.isEmpty
                                    ? 'Nothing due today'
                                    : '${dueReviews.length} ready to review',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                dueReviews.isEmpty
                                    ? nextReviewAt == null
                                          ? 'Missed questions will return here on a 1 → 3 → 7 → 14 day schedule.'
                                          : 'Next review ${_friendlyDate(nextReviewAt)}.'
                                    : 'A short review now makes the next interval longer.',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(color: colors.onSurfaceVariant),
                              ),
                              if (dueReviews.isNotEmpty) ...[
                                const SizedBox(height: 14),
                                FilledButton.tonal(
                                  onPressed: _startReview,
                                  child: const Text('Review mistakes'),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _startPractice() async {
    final latest = widget.controller.latestSolution;
    if (latest == null) {
      return;
    }
    setState(() => _isLoading = true);
    try {
      final practice = await widget.api.generatePractice(
        '${latest.problem}\n\n${latest.solution}',
      );
      if (mounted) {
        final reviewQuestions = widget.controller.dueReviewItems
            .take(2)
            .map((item) => item.question.copyWith(id: item.id));
        final questions = [
          ...reviewQuestions,
          ...practice.questions,
        ].take(4).toList(growable: false);
        await Navigator.of(context).push<void>(
          MaterialPageRoute(
            builder: (context) => QuizScreen(
              practice: PracticeSet(
                title: widget.controller.dueReviewItems.isEmpty
                    ? practice.title
                    : 'Daily warm-up',
                questions: questions,
              ),
              onAnswered: (question, correct) =>
                  widget.controller.recordPracticeAnswer(
                    question: question,
                    correct: correct,
                    sourceProblem: latest.problem,
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
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _startReview() async {
    final items = widget.controller.dueReviewItems.take(5).toList();
    if (items.isEmpty) return;
    unawaited(
      MobileAnalytics.reviewQueueStarted(
        questionCount: items.length,
        source: 'practice_tab',
      ),
    );
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => QuizScreen(
          practice: PracticeSet(
            title: 'Mistake review',
            questions: items
                .map((item) => item.question.copyWith(id: item.id))
                .toList(growable: false),
          ),
          reviewMode: true,
          onAnswered: (question, correct) =>
              widget.controller.recordPracticeAnswer(
                question: question,
                correct: correct,
                sourceProblem: '',
              ),
        ),
      ),
    );
  }

  static String _friendlyDate(DateTime value) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(value.year, value.month, value.day);
    final difference = day.difference(today).inDays;
    if (difference <= 0) return 'today';
    if (difference == 1) return 'tomorrow';
    return 'in $difference days';
  }
}

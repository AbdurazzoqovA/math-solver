import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../../core/network/mathsolver_api.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/math_text.dart';
import '../domain/math_review.dart';

class CheckWorkScreen extends StatefulWidget {
  const CheckWorkScreen({
    super.key,
    required this.bytes,
    required this.mimeType,
    required this.api,
    required this.onExplain,
  });

  final Uint8List bytes;
  final String mimeType;
  final MathSolverApi api;
  final Future<void> Function(WorkCheckResult result) onExplain;

  @override
  State<CheckWorkScreen> createState() => _CheckWorkScreenState();
}

class _CheckWorkScreenState extends State<CheckWorkScreen> {
  WorkCheckResult? _result;
  String? _error;
  var _isLoading = true;

  @override
  void initState() {
    super.initState();
    _review();
  }

  Future<void> _review() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await widget.api.checkWork(
        bytes: widget.bytes,
        mimeType: widget.mimeType,
      );
      if (mounted) setState(() => _result = result);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Check my work')),
      body: SafeArea(
        child: _isLoading
            ? const _ReviewingState()
            : _error != null
            ? _ReviewError(message: _error!, onRetry: _review)
            : _ReviewResult(
                result: _result!,
                onExplain: () => widget.onExplain(_result!),
              ),
      ),
    );
  }
}

class _ReviewingState extends StatelessWidget {
  const _ReviewingState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                color: AppTheme.mint,
                borderRadius: BorderRadius.circular(28),
              ),
              alignment: Alignment.center,
              child: const CircularProgressIndicator(strokeWidth: 4),
            ),
            const SizedBox(height: 24),
            Text(
              'Reading every line…',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'We will stop at the first step that needs attention.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewResult extends StatelessWidget {
  const _ReviewResult({required this.result, required this.onExplain});

  final WorkCheckResult result;
  final VoidCallback onExplain;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final hasMistake = result.status == WorkCheckStatus.hasMistake;
    final isCorrect = result.status == WorkCheckStatus.correct;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: isCorrect
                ? AppTheme.mint
                : hasMistake
                ? const Color(0xFFFFE1D6)
                : colors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                isCorrect
                    ? Icons.verified_rounded
                    : hasMistake
                    ? Icons.search_rounded
                    : Icons.photo_camera_back_outlined,
                size: 34,
                color: AppTheme.ink,
              ),
              const SizedBox(height: 14),
              Text(
                isCorrect
                    ? 'Your reasoning checks out.'
                    : hasMistake
                    ? 'We found the first snag.'
                    : 'Some writing is unclear.',
                style: Theme.of(
                  context,
                ).textTheme.headlineSmall?.copyWith(color: AppTheme.ink),
              ),
              const SizedBox(height: 7),
              Text(
                result.summary,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: AppTheme.ink),
              ),
              const SizedBox(height: 12),
              Text(
                'AI review · ${(result.confidence * 100).round()}% confidence',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppTheme.ink.withValues(alpha: 0.68),
                ),
              ),
            ],
          ),
        ),
        if (result.problem.isNotEmpty) ...[
          const SizedBox(height: 22),
          Text('Problem read', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: MathText(result.problem),
            ),
          ),
        ],
        const SizedBox(height: 22),
        Text('Your lines', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 10),
        for (final line in result.lines) ...[
          _WorkLineCard(
            line: line,
            isFirstMistake: line.index == result.firstMistakeIndex,
          ),
          const SizedBox(height: 10),
        ],
        if (result.nextHint.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.lightbulb_outline_rounded,
                  color: colors.onPrimaryContainer,
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    result.nextHint,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: colors.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        if (hasMistake || result.status == WorkCheckStatus.unclear) ...[
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: onExplain,
            icon: const Icon(Icons.school_outlined),
            label: const Text('Explain the fix step by step'),
          ),
        ],
      ],
    );
  }
}

class _WorkLineCard extends StatelessWidget {
  const _WorkLineCard({required this.line, required this.isFirstMistake});

  final WorkCheckLine line;
  final bool isFirstMistake;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final statusColor = switch (line.status) {
      WorkLineStatus.correct => AppTheme.mint,
      WorkLineStatus.incorrect => const Color(0xFFFFE1D6),
      WorkLineStatus.unclear => colors.surfaceContainerHigh,
    };
    final icon = switch (line.status) {
      WorkLineStatus.correct => Icons.check_rounded,
      WorkLineStatus.incorrect => Icons.close_rounded,
      WorkLineStatus.unclear => Icons.question_mark_rounded,
    };
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: statusColor,
        borderRadius: BorderRadius.circular(22),
        border: isFirstMistake
            ? Border.all(color: colors.error, width: 2)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: Colors.white70,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 20, color: AppTheme.ink),
              ),
              const SizedBox(width: 11),
              Expanded(child: MathText(line.transcription)),
            ],
          ),
          if (line.explanation.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              line.explanation,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppTheme.ink),
            ),
          ],
          if (line.correction?.isNotEmpty ?? false) ...[
            const SizedBox(height: 10),
            Text(
              'Try this:',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: AppTheme.ink,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            MathText(line.correction!),
          ],
        ],
      ),
    );
  }
}

class _ReviewError extends StatelessWidget {
  const _ReviewError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.image_not_supported_outlined, size: 54),
            const SizedBox(height: 18),
            Text(
              'We could not read every line',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

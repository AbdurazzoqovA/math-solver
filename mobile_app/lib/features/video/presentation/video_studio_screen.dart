import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../../core/analytics/mobile_analytics.dart';
import '../../../core/auth/account_controller.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/video_lesson_api.dart';
import '../../../core/storage/video_offline_cache.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/math_text.dart';
import '../../profile/account_sheet.dart';
import '../domain/video_lesson.dart';

class VideoStudioScreen extends StatefulWidget {
  const VideoStudioScreen({
    super.key,
    required this.account,
    required this.api,
    this.problem,
    this.solution,
    this.requestKey,
    this.existingJobId,
  }) : assert(
         existingJobId != null ||
             (problem != null && solution != null && requestKey != null),
       );

  final AccountController account;
  final VideoLessonApi api;
  final String? problem;
  final String? solution;
  final String? requestKey;
  final String? existingJobId;

  @override
  State<VideoStudioScreen> createState() => _VideoStudioScreenState();
}

class _VideoStudioScreenState extends State<VideoStudioScreen> {
  VideoJob? _job;
  String? _error;
  var _isLoading = false;
  var _run = 0;
  var _requestTracked = false;
  var _readyTracked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.account.isSignedIn) {
        _start();
      }
    });
  }

  @override
  void dispose() {
    _run++;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(plainMathPreview(_job?.lesson?.title ?? 'Video lesson')),
        actions: [
          if (_job?.quota case final quota?)
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: Center(child: _QuotaBadge(remaining: quota.remaining)),
            ),
        ],
      ),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: widget.account,
          builder: (context, _) {
            if (!widget.account.isConfigured) {
              return _VideoSignIn(isBusy: false, onSignIn: _showPreviewMessage);
            }
            if (!widget.account.isSignedIn) {
              return _VideoSignIn(
                isBusy: widget.account.isBusy,
                onSignIn: _signInAndStart,
              );
            }
            final job = _job;
            if (job?.status == VideoJobStatus.ready && job?.lesson != null) {
              return VideoLessonPlayer(lesson: job!.lesson!);
            }
            if (_error != null ||
                job?.status == VideoJobStatus.failed ||
                job?.status == VideoJobStatus.unsupported) {
              return _VideoError(
                message:
                    _error ??
                    job?.error?.message ??
                    'This lesson could not be generated.',
                canRetry:
                    widget.existingJobId == null &&
                    (job?.error?.retryable ?? true),
                onRetry: _start,
              );
            }
            return VideoGenerationProgress(
              progress: job?.progress ?? (_isLoading ? 3 : 0),
              label: job?.stageLabel ?? 'Opening the video studio',
              status: job?.status ?? VideoJobStatus.queued,
              problem: widget.problem,
            );
          },
        ),
      ),
    );
  }

  Future<void> _signInAndStart() async {
    final signedIn = await showAccountSheet(context, account: widget.account);
    if (signedIn && mounted) {
      await _start();
    }
  }

  void _showPreviewMessage() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Verified account access is unavailable in this preview build.',
        ),
      ),
    );
  }

  Future<void> _start() async {
    if (_isLoading || !widget.account.isSignedIn) {
      return;
    }
    final run = ++_run;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      var job = widget.existingJobId == null
          ? await widget.api.createJob(
              requestKey: widget.requestKey!,
              problem: widget.problem!,
              solution: widget.solution!,
            )
          : await widget.api.getJob(widget.existingJobId!);
      if (widget.existingJobId == null && !_requestTracked) {
        _requestTracked = true;
        unawaited(MobileAnalytics.videoLessonRequested());
        unawaited(_offerReadyNotifications());
      }
      if (!mounted || run != _run) {
        return;
      }
      setState(() => _job = job);
      while (!job.status.isTerminal && mounted && run == _run) {
        await Future<void>.delayed(AppConfig.videoPollInterval);
        if (!mounted || run != _run) {
          return;
        }
        job = await widget.api.getJob(job.id);
        if (mounted && run == _run) {
          setState(() => _job = job);
        }
      }
      if (job.status == VideoJobStatus.ready && !_readyTracked) {
        _readyTracked = true;
        unawaited(MobileAnalytics.videoLessonReady());
      }
    } on AccountException catch (error) {
      if (mounted && run == _run) {
        setState(() => _error = error.message);
      }
    } on VideoApiException catch (error) {
      if (mounted && run == _run) {
        setState(() => _error = error.message);
      }
    } on TimeoutException {
      if (mounted && run == _run) {
        setState(
          () => _error =
              'The studio is still working, but the status check timed out. Try again.',
        );
      }
    } on Object {
      if (mounted && run == _run) {
        setState(
          () =>
              _error = 'We lost the connection to the video studio. Try again.',
        );
      }
    } finally {
      if (mounted && run == _run) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _offerReadyNotifications() async {
    if (!await widget.api.shouldOfferReadyNotifications() || !mounted) return;
    final accepted = await showModalBottomSheet<bool>(
      context: context,
      useSafeArea: true,
      builder: (context) => const _NotificationOffer(),
    );
    await widget.api.markReadyNotificationOfferHandled();
    if (accepted != true) return;

    final enabled = await widget.api.enableReadyNotifications();
    if (!enabled && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Notifications stayed off. Your lesson will still appear in the library.',
          ),
        ),
      );
    }
  }
}

class _NotificationOffer extends StatelessWidget {
  const _NotificationOffer();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 8, 22, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppTheme.mint,
              borderRadius: BorderRadius.circular(18),
            ),
            alignment: Alignment.center,
            child: const Icon(
              Icons.notifications_active_outlined,
              color: AppTheme.ink,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Know when your lesson is ready',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Video lessons keep rendering after you leave. MathSolver can send one private, generic alert when this lesson is ready—never your problem or answer.',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.pop(context, true),
              icon: const Icon(Icons.notifications_none_rounded),
              label: const Text('Notify me when ready'),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Not now'),
            ),
          ),
        ],
      ),
    );
  }
}

class VideoGenerationProgress extends StatelessWidget {
  const VideoGenerationProgress({
    super.key,
    required this.progress,
    required this.label,
    required this.status,
    required this.problem,
  });

  final double progress;
  final String label;
  final VideoJobStatus status;
  final String? problem;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final normalized = (progress / 100).clamp(0.02, 1.0);
    return Align(
      alignment: Alignment.topCenter,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 36),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: _VideoRenderPreview(progress: progress),
                ),
              ),
              const SizedBox(height: 26),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      'Building your video lesson',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    '${progress.round()}%',
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(color: colors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: normalized),
                duration: const Duration(milliseconds: 650),
                curve: Curves.easeOutCubic,
                builder: (context, value, _) => ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: value,
                    minHeight: 10,
                    backgroundColor: colors.primaryContainer,
                    color: colors.primary,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                switchInCurve: Curves.easeOut,
                switchOutCurve: Curves.easeIn,
                child: Text(
                  label,
                  key: ValueKey(label),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Usually ready in under 90 seconds',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              _VideoPipeline(status: status),
              if (problem?.trim().isNotEmpty ?? false) ...[
                const SizedBox(height: 24),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: colors.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppTheme.mintCard(colors),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          Icons.functions_rounded,
                          color: AppTheme.onMintCard(colors),
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'YOUR PROBLEM',
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: colors.onSurfaceVariant,
                                    letterSpacing: 0.7,
                                  ),
                            ),
                            const SizedBox(height: 3),
                            MathText.auto(
                              problem!,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: colors.primaryContainer.withValues(alpha: 0.48),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.cloud_done_outlined,
                      size: 21,
                      color: colors.primary,
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Text(
                        'Safe to leave—we’ll keep rendering, and the finished lesson will appear in Library.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoRenderPreview extends StatefulWidget {
  const _VideoRenderPreview({required this.progress});

  final double progress;

  @override
  State<_VideoRenderPreview> createState() => _VideoRenderPreviewState();
}

class _VideoRenderPreviewState extends State<_VideoRenderPreview>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller
        ..stop()
        ..value = 0.42;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF182248), Color(0xFF344CC6)],
            ),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  final phase = _controller.value;
                  return Stack(
                    children: [
                      Positioned(
                        left: 18,
                        top: 17,
                        child: Row(
                          children: [
                            Opacity(
                              opacity:
                                  0.45 +
                                  (math.sin(phase * math.pi * 2) + 1) * 0.25,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.coral,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'MAKING YOUR LESSON',
                              style: TextStyle(
                                color: Colors.white70,
                                fontFamily: AppTheme.displayFamily,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        right: 18,
                        top: 14,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            '${widget.progress.round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontFamily: AppTheme.displayFamily,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 18,
                        right: 18,
                        top: 53,
                        bottom: 39,
                        child: Row(
                          children: [
                            _StoryboardFrame(
                              icon: Icons.functions_rounded,
                              label: 'Problem',
                              pulse: _pulse(phase, 0),
                            ),
                            const SizedBox(width: 9),
                            _StoryboardFrame(
                              icon: Icons.format_list_numbered_rounded,
                              label: 'Steps',
                              pulse: _pulse(phase, 1),
                            ),
                            const SizedBox(width: 9),
                            _StoryboardFrame(
                              icon: Icons.play_arrow_rounded,
                              label: 'Lesson',
                              pulse: _pulse(phase, 2),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        left: 18,
                        right: 18,
                        bottom: 19,
                        child: Container(
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 18 + (constraints.maxWidth - 40) * phase,
                        bottom: 12,
                        child: Container(
                          width: 4,
                          height: 18,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(99),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.white.withValues(alpha: 0.36),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  double _pulse(double phase, int index) {
    final wave = math.sin((phase * math.pi * 2) - (index * 1.45));
    return (wave + 1) / 2;
  }
}

class _StoryboardFrame extends StatelessWidget {
  const _StoryboardFrame({
    required this.icon,
    required this.label,
    required this.pulse,
  });

  final IconData icon;
  final String label;
  final double pulse;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Transform.scale(
        scale: 0.96 + (pulse * 0.04),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.1 + pulse * 0.13),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.18 + pulse * 0.34),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 26),
              const SizedBox(height: 5),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: AppTheme.displayFamily,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoPipeline extends StatelessWidget {
  const _VideoPipeline({required this.status});

  final VideoJobStatus status;

  int get _activeIndex => switch (status) {
    VideoJobStatus.queued || VideoJobStatus.planning => 0,
    VideoJobStatus.voicing => 1,
    VideoJobStatus.rendering => 2,
    VideoJobStatus.verifying || VideoJobStatus.uploading => 3,
    _ => 3,
  };

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    const steps = [
      (Icons.route_outlined, 'Plan'),
      (Icons.mic_none_rounded, 'Narrate'),
      (Icons.movie_creation_outlined, 'Animate'),
      (Icons.verified_outlined, 'Finish'),
    ];
    return Semantics(
      label: '${steps[_activeIndex].$2} stage in progress',
      child: Row(
        children: [
          for (var index = 0; index < steps.length; index++) ...[
            if (index > 0)
              Expanded(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 350),
                  height: 3,
                  decoration: BoxDecoration(
                    color: index <= _activeIndex
                        ? colors.primary
                        : colors.outlineVariant,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
            _PipelineStep(
              icon: steps[index].$1,
              label: steps[index].$2,
              isActive: index == _activeIndex,
              isComplete: index < _activeIndex,
            ),
          ],
        ],
      ),
    );
  }
}

class _PipelineStep extends StatelessWidget {
  const _PipelineStep({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.isComplete,
  });

  final IconData icon;
  final String label;
  final bool isActive;
  final bool isComplete;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final highlighted = isActive || isComplete;
    return SizedBox(
      width: 58,
      child: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 350),
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: highlighted ? colors.primary : colors.surfaceContainer,
              shape: BoxShape.circle,
              boxShadow: isActive
                  ? [
                      BoxShadow(
                        color: colors.primary.withValues(alpha: 0.22),
                        blurRadius: 0,
                        spreadRadius: 5,
                      ),
                    ]
                  : null,
            ),
            alignment: Alignment.center,
            child: Icon(
              isComplete ? Icons.check_rounded : icon,
              color: highlighted ? colors.onPrimary : colors.onSurfaceVariant,
              size: 18,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            label,
            maxLines: 1,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: isActive ? colors.primary : colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoSignIn extends StatelessWidget {
  const _VideoSignIn({required this.isBusy, required this.onSignIn});

  final bool isBusy;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 36),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 230,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1D2B68), AppTheme.electric],
                  ),
                  borderRadius: BorderRadius.circular(32),
                ),
                child: Stack(
                  children: [
                    const Center(
                      child: Icon(
                        Icons.play_circle_fill_rounded,
                        color: Colors.white,
                        size: 84,
                      ),
                    ),
                    Positioned(
                      left: 22,
                      right: 22,
                      bottom: 56,
                      child: Container(
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.28),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: 0.4,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(99),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const Positioned(
                      left: 22,
                      bottom: 20,
                      child: Text(
                        'Made for this exact problem',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 26),
              Text(
                'Watch the solution unfold.',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 10),
              Text(
                'MathSolver turns your completed steps into a private, uninterrupted animated explanation. Practice pauses are optional.',
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
              ),
              const SizedBox(height: 22),
              const _Benefit(
                icon: Icons.animation_rounded,
                text: 'Animated, step by step',
              ),
              const SizedBox(height: 10),
              const _Benefit(
                icon: Icons.hearing_rounded,
                text: 'Narrated and captioned',
              ),
              const SizedBox(height: 10),
              const _Benefit(
                icon: Icons.lock_outline_rounded,
                text: 'Private to your verified account',
              ),
              const SizedBox(height: 26),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: isBusy ? null : onSignIn,
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Sign in to make this video'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Benefit extends StatelessWidget {
  const _Benefit({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppTheme.mint,
            borderRadius: BorderRadius.circular(14),
          ),
          alignment: Alignment.center,
          child: Icon(icon, color: AppTheme.ink, size: 22),
        ),
        const SizedBox(width: 12),
        Text(text, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class _VideoError extends StatelessWidget {
  const _VideoError({
    required this.message,
    required this.canRetry,
    required this.onRetry,
  });

  final String message;
  final bool canRetry;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: colors.errorContainer,
                  borderRadius: BorderRadius.circular(24),
                ),
                alignment: Alignment.center,
                child: Icon(
                  Icons.video_file_outlined,
                  color: colors.onErrorContainer,
                  size: 36,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'The studio hit a snag',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
              ),
              if (canRetry) ...[
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _QuotaBadge extends StatelessWidget {
  const _QuotaBadge({required this.remaining});

  final int remaining;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: AppTheme.mint,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        '$remaining of 10 today',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: AppTheme.ink,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class VideoLessonPlayer extends StatefulWidget {
  const VideoLessonPlayer({super.key, required this.lesson});

  final VideoLessonManifest lesson;

  @override
  State<VideoLessonPlayer> createState() => _VideoLessonPlayerState();
}

class _VideoLessonPlayerState extends State<VideoLessonPlayer> {
  var _selectedClip = 0;
  var _practicePauses = false;
  var _autoPlaySelectedClip = false;
  var _clipFinished = false;
  final Map<String, String> _answers = {};

  void _selectClip(int index, {bool autoPlay = false}) {
    setState(() {
      _selectedClip = index;
      _autoPlaySelectedClip = autoPlay;
      _clipFinished = false;
    });
  }

  void _handleClipEnded() {
    final lesson = widget.lesson;
    final isLast = _selectedClip >= lesson.clips.length - 1;
    final hasCheckpoint = lesson.interactions.any(
      (item) => item.afterClip == lesson.clips[_selectedClip].id,
    );
    if (isLast || (_practicePauses && hasCheckpoint)) {
      setState(() => _clipFinished = true);
      return;
    }
    _selectClip(_selectedClip + 1, autoPlay: true);
  }

  @override
  Widget build(BuildContext context) {
    final lesson = widget.lesson;
    final clip = lesson.clips[_selectedClip];
    final checkpoint = lesson.interactions
        .where((item) => item.afterClip == clip.id)
        .firstOrNull;
    final isLast = _selectedClip == lesson.clips.length - 1;

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 34),
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 10, 12),
          decoration: BoxDecoration(
            color: _practicePauses
                ? AppTheme.mint
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              Icon(
                Icons.psychology_alt_outlined,
                color: _practicePauses
                    ? AppTheme.ink
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Practice pauses',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: _practicePauses ? AppTheme.ink : null,
                      ),
                    ),
                    Text(
                      _practicePauses
                          ? 'Pause between chapters for a quick check.'
                          : 'Off · chapters play continuously.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: _practicePauses
                            ? AppTheme.ink.withValues(alpha: 0.72)
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Switch.adaptive(
                value: _practicePauses,
                onChanged: (value) {
                  if (!value &&
                      _clipFinished &&
                      _selectedClip < lesson.clips.length - 1) {
                    setState(() => _practicePauses = false);
                    _selectClip(_selectedClip + 1, autoPlay: true);
                    return;
                  }
                  setState(() => _practicePauses = value);
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _LessonClipPlayer(
          lessonId: lesson.lessonId,
          clip: clip,
          autoPlay: _autoPlaySelectedClip,
          onAutoPlayConsumed: () {
            if (mounted) setState(() => _autoPlaySelectedClip = false);
          },
          onEnded: _handleClipEnded,
        ),
        const SizedBox(height: 18),
        MathText.auto(
          lesson.learningGoal,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Text(
          lesson.disclosure,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 54,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: lesson.clips.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final item = lesson.clips[index];
              return ChoiceChip(
                selected: index == _selectedClip,
                onSelected: (_) => _selectClip(index),
                avatar: CircleAvatar(
                  radius: 13,
                  backgroundColor: index == _selectedClip
                      ? Theme.of(context).colorScheme.onPrimaryContainer
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: Text(
                    '${item.step}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: index == _selectedClip
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                label: Text(plainMathPreview(item.title)),
              );
            },
          ),
        ),
        if (_practicePauses && _clipFinished && checkpoint != null) ...[
          const SizedBox(height: 18),
          _CheckpointCard(
            interaction: checkpoint,
            selected: _answers[checkpoint.id],
            onSelected: (answer) {
              setState(() => _answers[checkpoint.id] = answer);
            },
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed:
                  _answers[checkpoint.id] == checkpoint.correctOptionId &&
                      !isLast
                  ? () => _selectClip(_selectedClip + 1, autoPlay: true)
                  : null,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Continue video'),
            ),
          ),
        ],
        if (isLast && _practicePauses && _clipFinished) ...[
          const SizedBox(height: 18),
          _CheckpointCard(
            interaction: lesson.transferCheck,
            selected: _answers[lesson.transferCheck.id],
            onSelected: (answer) {
              setState(() => _answers[lesson.transferCheck.id] = answer);
            },
          ),
          if (_answers[lesson.transferCheck.id] ==
              lesson.transferCheck.correctOptionId) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.mint,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.celebration_outlined, color: AppTheme.ink),
                  const SizedBox(height: 10),
                  MathText.auto(
                    lesson.completionTitle,
                    style: Theme.of(
                      context,
                    ).textTheme.titleLarge?.copyWith(color: AppTheme.ink),
                  ),
                  const SizedBox(height: 6),
                  MathText.auto(
                    lesson.completionBody,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: AppTheme.ink),
                  ),
                ],
              ),
            ),
          ],
        ],
        if (isLast && !_practicePauses && _clipFinished) ...[
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.mint,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.check_circle_outline, color: AppTheme.ink),
                const SizedBox(height: 10),
                Text(
                  'The solution is explained.',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(color: AppTheme.ink),
                ),
                const SizedBox(height: 6),
                Text(
                  'Replay any chapter, or turn on Practice pauses to check your understanding.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppTheme.ink),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _LessonClipPlayer extends StatefulWidget {
  const _LessonClipPlayer({
    required this.lessonId,
    required this.clip,
    this.allowFullscreen = true,
    this.autoPlay = false,
    this.onAutoPlayConsumed,
    this.onEnded,
  });

  final String lessonId;
  final VideoLessonClip clip;
  final bool allowFullscreen;
  final bool autoPlay;
  final VoidCallback? onAutoPlayConsumed;
  final VoidCallback? onEnded;

  @override
  State<_LessonClipPlayer> createState() => _LessonClipPlayerState();
}

class _LessonClipPlayerState extends State<_LessonClipPlayer> {
  VideoPlayerController? _controller;
  Object? _error;
  File? _cachedFile;
  var _captionsEnabled = true;
  var _speed = 1.0;
  var _isSaving = false;
  var _didNotifyEnded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _LessonClipPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.lessonId != widget.lessonId ||
        oldWidget.clip.videoUrl != widget.clip.videoUrl) {
      _load();
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_changed);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    _didNotifyEnded = false;
    final previous = _controller;
    previous?.removeListener(_changed);
    _controller = null;
    await previous?.dispose();
    if (mounted) {
      setState(() => _error = null);
    }
    try {
      final cached = await _existingCacheFile();
      final captions = _loadCaptions();
      final controller = cached == null
          ? VideoPlayerController.networkUrl(
              Uri.parse(widget.clip.videoUrl),
              closedCaptionFile: captions,
            )
          : VideoPlayerController.file(cached, closedCaptionFile: captions);
      await controller.initialize();
      await controller.setLooping(false);
      await controller.setPlaybackSpeed(_speed);
      controller.addListener(_changed);
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _cachedFile = cached;
      });
      if (widget.autoPlay) {
        await controller.play();
        widget.onAutoPlayConsumed?.call();
      }
    } on Object catch (error) {
      if (mounted) {
        setState(() => _error = error);
      }
    }
  }

  Future<ClosedCaptionFile> _loadCaptions() async {
    final cached = await VideoOfflineCache.file(
      widget.lessonId,
      widget.clip.id,
      'vtt',
    );
    if (await cached.exists()) {
      return WebVTTCaptionFile(await cached.readAsString());
    }
    if (widget.clip.captionsUrl.trim().isEmpty) {
      return WebVTTCaptionFile('');
    }
    try {
      final response = await http
          .get(Uri.parse(widget.clip.captionsUrl))
          .timeout(AppConfig.requestTimeout);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return WebVTTCaptionFile(response.body);
      }
    } on Object {
      // Playback remains available when captions cannot be downloaded.
    }
    return WebVTTCaptionFile('');
  }

  Future<File?> _existingCacheFile() async {
    final file = await VideoOfflineCache.file(
      widget.lessonId,
      widget.clip.id,
      'mp4',
    );
    return await file.exists() ? file : null;
  }

  Future<void> _saveOffline() async {
    if (_isSaving || _cachedFile != null) return;
    setState(() => _isSaving = true);
    try {
      final response = await http
          .get(Uri.parse(widget.clip.videoUrl))
          .timeout(const Duration(minutes: 2));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw const HttpException('Download failed');
      }
      final file = await VideoOfflineCache.file(
        widget.lessonId,
        widget.clip.id,
        'mp4',
      );
      await file.writeAsBytes(response.bodyBytes, flush: true);
      if (widget.clip.captionsUrl.trim().isNotEmpty) {
        try {
          final captions = await http
              .get(Uri.parse(widget.clip.captionsUrl))
              .timeout(AppConfig.requestTimeout);
          if (captions.statusCode >= 200 && captions.statusCode < 300) {
            final captionFile = await VideoOfflineCache.file(
              widget.lessonId,
              widget.clip.id,
              'vtt',
            );
            await captionFile.writeAsString(captions.body, flush: true);
          }
        } on Object {
          // Saving the video remains useful if captions are unavailable.
        }
      }
      if (mounted) {
        setState(() => _cachedFile = file);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Saved for offline viewing.')),
        );
      }
    } on Object {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('This clip could not be saved.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _share() async {
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    final file = _cachedFile;
    await SharePlus.instance.share(
      ShareParams(
        text: file == null
            ? 'Watch this private MathSolver lesson while the link is active: ${widget.clip.videoUrl}'
            : 'A MathSolver explanation for this exact problem.',
        files: file == null ? null : [XFile(file.path)],
        sharePositionOrigin: origin,
      ),
    );
  }

  Future<void> _setSpeed(double speed) async {
    _speed = speed;
    await _controller?.setPlaybackSpeed(speed);
    if (mounted) setState(() {});
  }

  Future<void> _openFullscreen() async {
    final controller = _controller;
    await controller?.pause();
    if (!mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            title: Text(plainMathPreview(widget.clip.title)),
          ),
          body: Center(
            child: _LessonClipPlayer(
              lessonId: widget.lessonId,
              clip: widget.clip,
              allowFullscreen: false,
            ),
          ),
        ),
      ),
    );
  }

  void _changed() {
    final value = _controller?.value;
    if (value != null && value.isInitialized) {
      final remaining = value.duration - value.position;
      if (!_didNotifyEnded &&
          value.duration > Duration.zero &&
          remaining <= const Duration(milliseconds: 120) &&
          !value.isPlaying) {
        _didNotifyEnded = true;
        widget.onEnded?.call();
      } else if (remaining > const Duration(milliseconds: 500)) {
        _didNotifyEnded = false;
      }
    }
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (_error != null) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(26),
          ),
          child: const Center(
            child: Text(
              'This clip could not be loaded.',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ),
      );
    }
    if (controller == null || !controller.value.isInitialized) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(26),
          child: ColoredBox(
            color: Colors.black,
            child: Center(
              child: CircularProgressIndicator(
                color: Theme.of(context).colorScheme.primaryContainer,
              ),
            ),
          ),
        ),
      );
    }

    final duration = controller.value.duration.inMilliseconds;
    final position = controller.value.position.inMilliseconds.clamp(
      0,
      duration,
    );
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(26),
          child: AspectRatio(
            aspectRatio: controller.value.aspectRatio == 0
                ? 16 / 9
                : controller.value.aspectRatio,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: Colors.black, child: VideoPlayer(controller)),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      controller.value.isPlaying
                          ? controller.pause()
                          : controller.play();
                    },
                    child: Center(
                      child: AnimatedOpacity(
                        opacity: controller.value.isPlaying ? 0 : 1,
                        duration: const Duration(milliseconds: 180),
                        child: Container(
                          width: 62,
                          height: 62,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.play_arrow_rounded,
                            color: AppTheme.ink,
                            size: 38,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 54),
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0A1B2B),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                _captionsEnabled
                    ? Icons.closed_caption_rounded
                    : Icons.closed_caption_off_rounded,
                color: Colors.white70,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _captionsEnabled
                      ? controller.value.caption.text.trim().isEmpty
                            ? 'Captions will appear here without covering the math.'
                            : controller.value.caption.text
                      : 'Captions are off.',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton(
              tooltip: controller.value.isPlaying ? 'Pause' : 'Play',
              onPressed: () {
                controller.value.isPlaying
                    ? controller.pause()
                    : controller.play();
              },
              icon: Icon(
                controller.value.isPlaying
                    ? Icons.pause_rounded
                    : Icons.play_arrow_rounded,
              ),
            ),
            Expanded(
              child: Slider(
                value: duration == 0 ? 0 : position.toDouble(),
                max: duration == 0 ? 1 : duration.toDouble(),
                onChanged: (value) {
                  controller.seekTo(Duration(milliseconds: value.round()));
                },
              ),
            ),
            Text(
              _time(controller.value.duration),
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ],
        ),
        Wrap(
          spacing: 2,
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            PopupMenuButton<double>(
              tooltip: 'Playback speed',
              initialValue: _speed,
              onSelected: _setSpeed,
              itemBuilder: (context) => const [
                PopupMenuItem(value: 0.75, child: Text('0.75×')),
                PopupMenuItem(value: 1, child: Text('1×')),
                PopupMenuItem(value: 1.25, child: Text('1.25×')),
                PopupMenuItem(value: 1.5, child: Text('1.5×')),
                PopupMenuItem(value: 2, child: Text('2×')),
              ],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  '${_speed.toStringAsFixed(_speed == 1 ? 0 : 2)}×',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
            ),
            IconButton(
              tooltip: _captionsEnabled
                  ? 'Turn captions off'
                  : 'Turn captions on',
              onPressed: () =>
                  setState(() => _captionsEnabled = !_captionsEnabled),
              icon: Icon(
                _captionsEnabled
                    ? Icons.closed_caption_rounded
                    : Icons.closed_caption_off_rounded,
              ),
            ),
            IconButton(
              tooltip: _cachedFile == null ? 'Save offline' : 'Saved offline',
              onPressed: _cachedFile != null || _isSaving ? null : _saveOffline,
              icon: _isSaving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      _cachedFile == null
                          ? Icons.download_rounded
                          : Icons.download_done_rounded,
                    ),
            ),
            IconButton(
              tooltip: 'Share lesson',
              onPressed: _share,
              icon: const Icon(Icons.ios_share_rounded),
            ),
            if (widget.allowFullscreen)
              IconButton(
                tooltip: 'Full screen',
                onPressed: _openFullscreen,
                icon: const Icon(Icons.fullscreen_rounded),
              ),
          ],
        ),
      ],
    );
  }

  static String _time(Duration value) {
    final minutes = value.inMinutes;
    final seconds = value.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}

class _CheckpointCard extends StatelessWidget {
  const _CheckpointCard({
    required this.interaction,
    required this.selected,
    required this.onSelected,
  });

  final VideoLessonInteraction interaction;
  final String? selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final isCorrect = selected == interaction.correctOptionId;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            interaction.eyebrow.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.primary,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.9,
            ),
          ),
          if (interaction.problem != null) ...[
            const SizedBox(height: 10),
            MathText.auto(
              interaction.problem!,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
          const SizedBox(height: 8),
          MathText.auto(
            interaction.prompt,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 14),
          for (final option in interaction.options) ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => onSelected(option.id),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  backgroundColor: selected == option.id
                      ? colors.primaryContainer
                      : null,
                ),
                child: MathText.auto(option.label),
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (selected != null)
            MathText.auto(
              isCorrect
                  ? interaction.correctFeedback
                  : interaction.incorrectFeedback,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: isCorrect ? const Color(0xFF0A6B49) : colors.error,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }
}

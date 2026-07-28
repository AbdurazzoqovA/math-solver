import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/auth/account_controller.dart';
import '../../../core/network/video_lesson_api.dart';
import '../../../core/theme/app_theme.dart';
import '../../profile/account_sheet.dart';
import '../domain/video_lesson.dart';
import 'video_studio_screen.dart';

class VideoLibraryPanel extends StatefulWidget {
  const VideoLibraryPanel({
    super.key,
    required this.account,
    required this.api,
  });

  final AccountController account;
  final VideoLessonApi api;

  @override
  State<VideoLibraryPanel> createState() => _VideoLibraryPanelState();
}

class _VideoLibraryPanelState extends State<VideoLibraryPanel> {
  VideoJobList? _library;
  String? _error;
  var _isLoading = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    widget.account.addListener(_accountChanged);
    if (widget.account.isSignedIn) {
      _load();
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    widget.account.removeListener(_accountChanged);
    super.dispose();
  }

  void _accountChanged() {
    if (!mounted) {
      return;
    }
    if (widget.account.isSignedIn && _library == null && !_isLoading) {
      _load();
    } else if (!widget.account.isSignedIn) {
      _refreshTimer?.cancel();
      setState(() => _library = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.account.isSignedIn) {
      return _EmptyVideoLibrary(onSignIn: _signIn);
    }
    if (_isLoading && _library == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 90),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null && _library == null) {
      return _LibraryError(message: _error!, onRetry: _load);
    }
    final library = _library;
    if (library == null || library.jobs.isEmpty) {
      return _SignedInEmpty(
        remaining: library?.quota.remaining,
        onRefresh: _load,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '${library.quota.remaining} free videos left today',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            IconButton(
              tooltip: 'Refresh videos',
              onPressed: _isLoading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final job in library.jobs) ...[
          _VideoLibraryCard(job: job, onTap: () => _open(job)),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  Future<void> _signIn() async {
    if (!widget.account.isConfigured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Verified account access is unavailable in this preview build.',
          ),
        ),
      );
      return;
    }
    final signedIn = await showAccountSheet(context, account: widget.account);
    if (signedIn && mounted) {
      await _load();
    }
  }

  Future<void> _load() async {
    if (_isLoading || !widget.account.isSignedIn) {
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final library = await widget.api.listJobs();
      if (!mounted) {
        return;
      }
      setState(() => _library = library);
      _refreshTimer?.cancel();
      if (library.jobs.any((job) => job.status.isActive)) {
        _refreshTimer = Timer(const Duration(seconds: 5), _load);
      }
    } on AccountException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } on VideoApiException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } on Object {
      if (mounted) {
        setState(() => _error = 'Your videos could not be loaded.');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _open(VideoJobSummary job) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: widget.account,
          api: widget.api,
          existingJobId: job.id,
        ),
      ),
    );
    if (mounted) {
      await _load();
    }
  }
}

class _VideoLibraryCard extends StatelessWidget {
  const _VideoLibraryCard({required this.job, required this.onTap});

  final VideoJobSummary job;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            SizedBox(
              width: 116,
              height: 112,
              child: job.posterUrl == null
                  ? ColoredBox(
                      color: job.status.isActive
                          ? colors.primaryContainer
                          : colors.surfaceContainer,
                      child: Center(
                        child: job.status.isActive
                            ? SizedBox.square(
                                dimension: 44,
                                child: CircularProgressIndicator(
                                  value: (job.progress / 100).clamp(0.02, 1),
                                  strokeWidth: 5,
                                ),
                              )
                            : Icon(
                                Icons.play_circle_outline_rounded,
                                color: colors.primary,
                                size: 42,
                              ),
                      ),
                    )
                  : Image.network(
                      job.posterUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => ColoredBox(
                        color: colors.primaryContainer,
                        child: const Icon(Icons.play_arrow_rounded, size: 40),
                      ),
                    ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StatusPill(status: job.status),
                    const SizedBox(height: 9),
                    Text(
                      job.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      job.status == VideoJobStatus.ready
                          ? _metadata(job)
                          : job.error?.message ??
                                '${job.stageLabel} · ${job.progress.round()}%',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 10),
              child: Icon(Icons.chevron_right_rounded),
            ),
          ],
        ),
      ),
    );
  }

  static String _metadata(VideoJobSummary job) {
    final seconds = (job.durationSeconds ?? 0).round();
    final duration = seconds == 0
        ? ''
        : '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
    final chapters = job.clipCount == null ? '' : '${job.clipCount} chapters';
    return [duration, chapters].where((value) => value.isNotEmpty).join(' · ');
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final VideoJobStatus status;

  @override
  Widget build(BuildContext context) {
    final ready = status == VideoJobStatus.ready;
    final failed =
        status == VideoJobStatus.failed || status == VideoJobStatus.unsupported;
    final background = ready
        ? AppTheme.mint
        : failed
        ? Theme.of(context).colorScheme.errorContainer
        : Theme.of(context).colorScheme.primaryContainer;
    final foreground = ready
        ? AppTheme.ink
        : failed
        ? Theme.of(context).colorScheme.onErrorContainer
        : Theme.of(context).colorScheme.onPrimaryContainer;
    final label = ready
        ? 'READY'
        : failed
        ? 'NEEDS ATTENTION'
        : 'RENDERING';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _EmptyVideoLibrary extends StatelessWidget {
  const _EmptyVideoLibrary({required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF243574), AppTheme.electric],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.play_circle_fill_rounded,
            size: 48,
            color: Colors.white,
          ),
          const SizedBox(height: 18),
          Text(
            'Your personal video shelf',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(color: Colors.white),
          ),
          const SizedBox(height: 8),
          Text(
            'Every generated explanation stays private and returns here when it is ready.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.82),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: onSignIn,
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppTheme.ink,
            ),
            icon: const Icon(Icons.login_rounded),
            label: const Text('Sign in to see videos'),
          ),
          const SizedBox(height: 12),
          Text(
            'Full written steps stay free without an account.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: colors.onPrimary),
          ),
        ],
      ),
    );
  }
}

class _SignedInEmpty extends StatelessWidget {
  const _SignedInEmpty({required this.remaining, required this.onRefresh});

  final int? remaining;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.video_library_outlined, size: 54),
            const SizedBox(height: 16),
            Text(
              'No videos yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 7),
            Text(
              'Open any solution and tap Make video.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            if (remaining != null) ...[
              const SizedBox(height: 8),
              Text('$remaining free lessons available today'),
            ],
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryError extends StatelessWidget {
  const _LibraryError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 50),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.cloud_off_outlined, size: 50),
            const SizedBox(height: 14),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 14),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

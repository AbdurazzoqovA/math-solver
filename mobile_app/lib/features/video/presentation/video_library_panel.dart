import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/auth/account_controller.dart';
import '../../../core/network/video_lesson_api.dart';
import '../../../core/storage/video_offline_cache.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/math_text.dart';
import '../../profile/account_sheet.dart';
import '../domain/video_lesson.dart';
import 'video_studio_screen.dart';

class VideoLibraryPanel extends StatefulWidget {
  const VideoLibraryPanel({
    super.key,
    required this.account,
    required this.api,
    this.offlineLessonsLoader,
  });

  final AccountController account;
  final VideoLessonApi api;
  final Future<List<OfflineVideoLesson>> Function(String ownerUserId)?
  offlineLessonsLoader;

  @override
  State<VideoLibraryPanel> createState() => _VideoLibraryPanelState();
}

class _VideoLibraryPanelState extends State<VideoLibraryPanel>
    with WidgetsBindingObserver {
  VideoJobList? _library;
  List<OfflineVideoLesson> _offlineLessons = const [];
  String? _error;
  var _isLoading = false;
  var _offlineLoaded = false;
  Timer? _refreshTimer;
  var _loadGeneration = 0;
  late AppLifecycleState _lifecycleState;
  String? _activeUserId;

  @override
  void initState() {
    super.initState();
    _lifecycleState =
        WidgetsBinding.instance.lifecycleState ?? AppLifecycleState.resumed;
    _activeUserId = widget.account.isSignedIn ? widget.account.userId : null;
    WidgetsBinding.instance.addObserver(this);
    widget.account.addListener(_accountChanged);
    if (widget.account.isSignedIn && _isResumed) {
      _load();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _invalidateLoads();
    widget.account.removeListener(_accountChanged);
    super.dispose();
  }

  bool get _isResumed => _lifecycleState == AppLifecycleState.resumed;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    if (state != AppLifecycleState.resumed) {
      _invalidateLoads();
      return;
    }
    if (widget.account.isSignedIn) {
      _load();
    }
  }

  void _invalidateLoads() {
    _loadGeneration++;
    _isLoading = false;
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  void _accountChanged() {
    if (!mounted) {
      return;
    }
    final nextUserId = widget.account.isSignedIn ? widget.account.userId : null;
    if (nextUserId != _activeUserId) {
      _activeUserId = nextUserId;
      _invalidateLoads();
      setState(() {
        _library = null;
        _offlineLessons = const [];
        _offlineLoaded = false;
        _error = null;
      });
      if (nextUserId != null && _isResumed) _load();
      return;
    }
    if (widget.account.isSignedIn &&
        _library == null &&
        !_isLoading &&
        _isResumed) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.account.isSignedIn) {
      return _EmptyVideoLibrary(onSignIn: _signIn);
    }
    if (_isLoading && _library == null && !_offlineLoaded) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 90),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null && _library == null && _offlineLessons.isEmpty) {
      return _LibraryError(message: _error!, onRetry: _load);
    }
    final library = _library;
    if ((library == null || library.jobs.isEmpty) && _offlineLessons.isEmpty) {
      return _SignedInEmpty(
        remaining: library?.quota.remaining,
        onRefresh: _load,
      );
    }

    final remoteIds = library?.jobs.map((job) => job.id).toSet() ?? const {};
    final offlineOnly = _offlineLessons
        .where((lesson) => !remoteIds.contains(lesson.jobId))
        .toList(growable: false);
    final offlineById = {
      for (final lesson in _offlineLessons) lesson.jobId: lesson,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                library == null
                    ? 'Saved on this device'
                    : '${library.quota.remaining} of ${library.quota.limit} videos available today',
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
        if (_error != null) ...[
          _OfflineNotice(message: _error!),
          const SizedBox(height: 12),
        ],
        for (final job in library?.jobs ?? const <VideoJobSummary>[]) ...[
          _VideoLibraryCard(
            job: job,
            onTap: () {
              final offline = offlineById[job.id];
              if (job.status == VideoJobStatus.ready && offline != null) {
                _openOffline(offline);
              } else {
                _open(job);
              }
            },
            onDelete: () => _delete(job),
          ),
          const SizedBox(height: 12),
        ],
        for (final lesson in offlineOnly) ...[
          _OfflineVideoLibraryCard(
            lesson: lesson,
            onTap: () => _openOffline(lesson),
            onDelete: () => _deleteOffline(lesson),
          ),
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
    if (_isLoading || !widget.account.isSignedIn || !_isResumed) {
      return;
    }
    _refreshTimer?.cancel();
    _refreshTimer = null;
    final userId = _activeUserId;
    if (userId == null || widget.account.userId != userId) return;
    final generation = ++_loadGeneration;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    final loader =
        widget.offlineLessonsLoader ??
        (ownerUserId) =>
            VideoOfflineCache.listLessons(ownerUserId: ownerUserId);
    final offlineFuture = _capture(() => loader(userId));
    final libraryFuture = _capture(
      () => widget.api.listJobs(expectedUserId: userId),
    );
    unawaited(_finishOfflineLoad(offlineFuture, generation));
    try {
      final attempt = await libraryFuture;
      if (attempt.error case final error?) {
        Error.throwWithStackTrace(error, attempt.stackTrace!);
      }
      final library = attempt.value!;
      if (!_isCurrentLoad(generation)) {
        return;
      }
      setState(() => _library = library);
      if (library.jobs.any((job) => job.status.isActive)) {
        _scheduleRefresh();
      }
    } on AccountException catch (error) {
      if (_isCurrentLoad(generation)) {
        setState(() => _error = error.message);
        _scheduleActiveJobRecovery();
      }
    } on VideoApiException catch (error) {
      if (_isCurrentLoad(generation)) {
        setState(() => _error = error.message);
        if (_isTransientApiError(error)) {
          _scheduleActiveJobRecovery();
        }
      }
    } on Object {
      if (_isCurrentLoad(generation)) {
        setState(() => _error = 'Your videos could not be loaded.');
        _scheduleActiveJobRecovery();
      }
    } finally {
      if (_isCurrentLoad(generation)) {
        setState(() => _isLoading = false);
      }
    }
  }

  bool _isCurrentLoad(int generation) {
    return mounted &&
        generation == _loadGeneration &&
        _isResumed &&
        widget.account.isSignedIn &&
        widget.account.userId == _activeUserId;
  }

  Future<_LoadAttempt<T>> _capture<T>(Future<T> Function() load) async {
    try {
      return _LoadAttempt.success(await load());
    } on Object catch (error, stackTrace) {
      return _LoadAttempt.failure(error, stackTrace);
    }
  }

  Future<void> _finishOfflineLoad(
    Future<_LoadAttempt<List<OfflineVideoLesson>>> load,
    int generation,
  ) async {
    final attempt = await load;
    if (!_isCurrentLoad(generation)) return;
    setState(() {
      if (attempt.value case final offlineLessons?) {
        _offlineLessons = offlineLessons;
      }
      _offlineLoaded = true;
    });
  }

  bool _isTransientApiError(VideoApiException error) {
    final status = error.statusCode;
    return status == null || status == 408 || status >= 500;
  }

  void _scheduleActiveJobRecovery() {
    final library = _library;
    if (library != null && library.jobs.any((job) => job.status.isActive)) {
      _scheduleRefresh();
    }
  }

  void _scheduleRefresh() {
    _refreshTimer?.cancel();
    if (!_isResumed || !widget.account.isSignedIn) return;
    _refreshTimer = Timer(const Duration(seconds: 5), () {
      _refreshTimer = null;
      _load();
    });
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

  Future<void> _openOffline(OfflineVideoLesson lesson) async {
    final userId = _activeUserId;
    if (userId == null ||
        lesson.ownerUserId != userId ||
        widget.account.userId != userId) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: widget.account,
          api: widget.api,
          existingJobId: lesson.jobId,
          offlineLesson: lesson.lesson,
          offlineOwnerUserId: userId,
        ),
      ),
    );
    if (mounted) await _load();
  }

  Future<void> _delete(VideoJobSummary job) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this video?'),
        content: const Text(
          'The private video and any copy saved offline on this device will be permanently deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      final userId = _activeUserId;
      if (userId == null || widget.account.userId != userId) return;
      await widget.api.deleteJob(job.id, expectedUserId: userId);
      await VideoOfflineCache.deleteLesson(
        ownerUserId: userId,
        lessonId: job.id,
      );
      await _load();
    } on VideoApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } on Object {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('The video could not be deleted.')),
        );
      }
    }
  }

  Future<void> _deleteOffline(OfflineVideoLesson lesson) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove offline copy?'),
        content: const Text(
          'This removes the copy saved on this device. It does not delete the online lesson.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    final userId = _activeUserId;
    if (confirmed != true ||
        !mounted ||
        userId == null ||
        lesson.ownerUserId != userId ||
        widget.account.userId != userId) {
      return;
    }
    try {
      await VideoOfflineCache.deleteLesson(
        ownerUserId: userId,
        lessonId: lesson.jobId,
      );
      if (mounted && widget.account.userId == userId) {
        setState(
          () => _offlineLessons = _offlineLessons
              .where((item) => item.jobId != lesson.jobId)
              .toList(growable: false),
        );
      }
    } on Object {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('The offline copy could not be removed.'),
          ),
        );
      }
    }
  }
}

class _LoadAttempt<T> {
  const _LoadAttempt.success(this.value) : error = null, stackTrace = null;

  const _LoadAttempt.failure(this.error, this.stackTrace) : value = null;

  final T? value;
  final Object? error;
  final StackTrace? stackTrace;
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colors.secondaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(Icons.offline_bolt_outlined, color: colors.onSecondaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Online videos could not be refreshed. Saved lessons still work offline.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: colors.onSecondaryContainer,
              ),
            ),
          ),
          IconButton(
            tooltip: message,
            onPressed: null,
            icon: const Icon(Icons.info_outline_rounded),
          ),
        ],
      ),
    );
  }
}

class _OfflineVideoLibraryCard extends StatelessWidget {
  const _OfflineVideoLibraryCard({
    required this.lesson,
    required this.onTap,
    required this.onDelete,
  });

  final OfflineVideoLesson lesson;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final seconds = lesson.durationSeconds.round();
    final duration = seconds <= 0
        ? null
        : '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
    final metadata = <String?>[
      duration,
      '${lesson.lesson.clips.length} ${lesson.lesson.clips.length == 1 ? 'chapter' : 'chapters'}',
    ].whereType<String>().join(' · ');
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
              child: ColoredBox(
                color: AppTheme.mint,
                child: const Center(
                  child: Icon(
                    Icons.offline_pin_rounded,
                    color: AppTheme.ink,
                    size: 42,
                  ),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.mint,
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        'SAVED OFFLINE',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.ink,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 9),
                    Text(
                      plainMathPreview(lesson.lesson.title),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      metadata,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            PopupMenuButton<String>(
              tooltip: 'Offline video options',
              onSelected: (value) {
                if (value == 'delete') onDelete();
              },
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: 'delete',
                  child: Text('Remove offline copy'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _VideoLibraryCard extends StatelessWidget {
  const _VideoLibraryCard({
    required this.job,
    required this.onTap,
    required this.onDelete,
  });

  final VideoJobSummary job;
  final VoidCallback onTap;
  final VoidCallback onDelete;

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
                      plainMathPreview(job.title),
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
            PopupMenuButton<String>(
              tooltip: 'Video options',
              onSelected: (value) {
                if (value == 'delete') onDelete();
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'delete', child: Text('Delete video')),
              ],
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
              Text('$remaining of 10 video lessons available today'),
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

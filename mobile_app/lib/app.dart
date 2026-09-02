import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'core/auth/account_controller.dart';
import 'core/network/cloud_notebook_api.dart';
import 'core/network/mathsolver_api.dart';
import 'core/network/notebook_sync_coordinator.dart';
import 'core/network/video_lesson_api.dart';
import 'core/reviews/app_review_service.dart';
import 'core/storage/notebook_repository.dart';
import 'core/theme/app_theme.dart';
import 'core/update/mobile_version_policy.dart';
import 'features/app/app_controller.dart';
import 'features/home/home_shell.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/video/presentation/video_studio_screen.dart';

class MathSolverApp extends StatefulWidget {
  const MathSolverApp({super.key, this.repository, this.api});

  final NotebookRepository? repository;
  final MathSolverApi? api;

  @override
  State<MathSolverApp> createState() => _MathSolverAppState();
}

class _MathSolverAppState extends State<MathSolverApp>
    with WidgetsBindingObserver {
  late final AppController _controller;
  late final MathSolverApi _api;
  late final AccountController _account;
  late final VideoLessonApi _videoApi;
  late final CloudNotebookApi _cloudNotebook;
  late final NotebookSyncCoordinator _notebookSync;
  late final MobileVersionPolicyService _versionPolicyService;
  final _navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription<RemoteMessage>? _notificationOpenSubscription;
  String? _pendingVideoJobId;
  String? _observedAccountUserId;
  Future<void> _notificationAccountTransition = Future<void>.value();
  var _pendingVideoOpenScheduled = false;
  MobileVersionPolicy? _versionPolicy;
  var _optionalUpdateDismissed = false;
  Future<void>? _versionPolicyRefresh;
  DateTime? _lastVersionPolicyRefreshAt;
  static const _versionPolicyRefreshInterval = Duration(minutes: 15);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = AppController(
      widget.repository ?? SharedPreferencesNotebookRepository(),
      reviewRequester: AppReviewService(),
    );
    _api = widget.api ?? MathSolverApi();
    _account = AccountController();
    _videoApi = VideoLessonApi(account: _account);
    _cloudNotebook = CloudNotebookApi(account: _account);
    _notebookSync = NotebookSyncCoordinator(
      _controller,
      _account,
      _cloudNotebook,
    );
    _versionPolicyService = MobileVersionPolicyService();
    _controller.onSolutionAdded = (record) {
      final ownerId = _controller.learningOwnerId;
      if (ownerId == null) return Future<void>.value();
      return _cloudNotebook.saveSolution(record, expectedUserId: ownerId);
    };
    _controller.onSolutionRemoved = (id) {
      final ownerId = _controller.learningOwnerId;
      if (ownerId == null) return Future<void>.value();
      return _cloudNotebook.deleteSolution(id, expectedUserId: ownerId);
    };
    _account.addListener(_onAccountChanged);
    _controller.initialize().then((_) {
      _notebookSync.schedule();
      _openPendingNotification();
    });
    _account.initialize().then((_) {
      _notebookSync.schedule();
      _restoreReadyNotifications();
      _openPendingNotification();
    });
    unawaited(_refreshVersionPolicy(force: true));
    if (Firebase.apps.isNotEmpty) {
      _notificationOpenSubscription = FirebaseMessaging.onMessageOpenedApp
          .listen(_handleNotificationOpen, onError: (Object _) {});
      unawaited(_loadInitialNotification());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _videoApi.close();
    _notificationOpenSubscription?.cancel();
    _account.removeListener(_onAccountChanged);
    _notebookSync.dispose();
    _cloudNotebook.close();
    _versionPolicyService.close();
    _account.dispose();
    _api.close();
    _controller.dispose();
    super.dispose();
  }

  void _onAccountChanged() {
    _notebookSync.schedule();
    final userId = _account.isSignedIn ? _account.userId : null;
    if (userId != _observedAccountUserId) {
      final previousUserId = _observedAccountUserId;
      _observedAccountUserId = userId;
      _queueNotificationAccountTransition(previousUserId, userId);
    }
    _openPendingNotification();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    _notebookSync.schedule(retryPendingWrites: true);
    _restoreReadyNotifications();
    unawaited(_refreshVersionPolicy());
    _openPendingNotification();
  }

  Future<void> _loadInitialNotification() async {
    try {
      final message = await FirebaseMessaging.instance.getInitialMessage();
      if (message != null) _handleNotificationOpen(message);
    } on Object {
      // Notification startup must never prevent the normal app launch.
    }
  }

  void _restoreReadyNotifications() {
    final userId = _account.isSignedIn ? _account.userId : null;
    if (userId == null) return;
    final previous = _notificationAccountTransition;
    _notificationAccountTransition = () async {
      try {
        await previous;
      } on Object {
        // A failed prior cleanup must not block a later safe restore.
      }
      if (!mounted || _account.userId != userId) return;
      await _videoApi.restoreReadyNotifications(expectedUserId: userId);
    }();
  }

  void _queueNotificationAccountTransition(
    String? previousUserId,
    String? nextUserId,
  ) {
    final previous = _notificationAccountTransition;
    final deactivation = previousUserId != null && previousUserId != nextUserId
        ? _videoApi.deactivateReadyNotifications()
        : Future<void>.value();
    _notificationAccountTransition = () async {
      try {
        await deactivation;
      } on Object {
        // The API independently attempts both local token safeguards.
      }
      try {
        await previous;
      } on Object {
        // Continue with local token isolation even if an older step failed.
      }
      if (!mounted ||
          nextUserId == null ||
          !_account.isSignedIn ||
          _account.userId != nextUserId) {
        return;
      }
      await _videoApi.restoreReadyNotifications(expectedUserId: nextUserId);
    }();
  }

  void _handleNotificationOpen(RemoteMessage message) {
    if (message.data['kind'] != 'video_ready') return;
    final jobId = message.data['jobId'];
    if (jobId is! String || !RegExp(r'^[a-f0-9]{40}$').hasMatch(jobId)) return;
    _pendingVideoJobId = jobId;
    _openPendingNotification();
  }

  void _openPendingNotification() {
    final jobId = _pendingVideoJobId;
    if (jobId == null ||
        _pendingVideoOpenScheduled ||
        !_canOpenPendingNotification()) {
      return;
    }
    _pendingVideoOpenScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _pendingVideoOpenScheduled = false;
      if (!mounted ||
          _pendingVideoJobId != jobId ||
          !_canOpenPendingNotification()) {
        return;
      }
      final navigator = _navigatorKey.currentState!;
      _pendingVideoJobId = null;
      unawaited(
        navigator.push<void>(
          MaterialPageRoute(
            builder: (context) => VideoStudioScreen(
              account: _account,
              api: _videoApi,
              existingJobId: jobId,
            ),
          ),
        ),
      );
    });
  }

  bool _canOpenPendingNotification() =>
      _navigatorKey.currentState != null &&
      _controller.isReady &&
      _controller.hasCompletedOnboarding &&
      _account.isSignedIn &&
      !(_versionPolicy?.isRequired ?? false);

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _controller,
      builder: (context, _) {
        return MaterialApp(
          navigatorKey: _navigatorKey,
          title: 'MathSolver',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: _controller.themeMode,
          builder: (context, child) =>
              _buildVersionAwareShell(child ?? const SizedBox.shrink()),
          home: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            child: _buildHome(),
          ),
        );
      },
    );
  }

  Widget _buildVersionAwareShell(Widget app) {
    final policy = _versionPolicy;
    final showUpdate =
        _controller.hasCompletedOnboarding &&
        policy != null &&
        policy.shouldPrompt &&
        (policy.isRequired || !_optionalUpdateDismissed);
    if (!showUpdate) return app;

    return Stack(
      children: [
        app,
        Positioned.fill(
          child: _UpdatePrompt(
            policy: policy,
            onUpdate: () => _openStore(policy.storeUrl!),
            onDismiss: policy.isRequired
                ? null
                : () => _dismissOptionalUpdate(policy),
          ),
        ),
      ],
    );
  }

  Future<void> _loadVersionPolicy() async {
    final policy = await _versionPolicyService.load();
    if (mounted && policy != null) {
      final dismissed =
          !policy.isRequired &&
          await _versionPolicyService.wasOptionalUpdateDismissed(
            policy.latestVersion,
          );
      if (mounted) {
        setState(() {
          _versionPolicy = policy;
          _optionalUpdateDismissed = dismissed;
        });
      }
    }
  }

  Future<void> _refreshVersionPolicy({bool force = false}) {
    final active = _versionPolicyRefresh;
    if (active != null) return active;
    final lastRefresh = _lastVersionPolicyRefreshAt;
    if (!force &&
        lastRefresh != null &&
        DateTime.now().difference(lastRefresh) <
            _versionPolicyRefreshInterval) {
      return Future<void>.value();
    }

    late final Future<void> operation;
    operation = () async {
      try {
        await _loadVersionPolicy();
      } finally {
        _lastVersionPolicyRefreshAt = DateTime.now();
        if (identical(_versionPolicyRefresh, operation)) {
          _versionPolicyRefresh = null;
        }
      }
    }();
    _versionPolicyRefresh = operation;
    return operation;
  }

  void _dismissOptionalUpdate(MobileVersionPolicy policy) {
    setState(() => _optionalUpdateDismissed = true);
    unawaited(
      _versionPolicyService.dismissOptionalUpdate(policy.latestVersion),
    );
  }

  Future<void> _openStore(Uri url) async {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  Widget _buildHome() {
    if (!_controller.isReady) {
      return const _LaunchScreen(key: ValueKey('launch'));
    }

    if (!_controller.hasCompletedOnboarding) {
      return OnboardingScreen(
        key: const ValueKey('onboarding'),
        onComplete: _controller.completeOnboarding,
      );
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _openPendingNotification();
    });
    return HomeShell(
      key: const ValueKey('home'),
      controller: _controller,
      api: _api,
      account: _account,
      videoApi: _videoApi,
    );
  }
}

class _UpdatePrompt extends StatelessWidget {
  const _UpdatePrompt({
    required this.policy,
    required this.onUpdate,
    required this.onDismiss,
  });

  final MobileVersionPolicy policy;
  final VoidCallback onUpdate;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.scrim.withValues(alpha: 0.55),
      child: SafeArea(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 620),
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  policy.isRequired
                      ? Icons.security_update_good_rounded
                      : Icons.system_update_alt_rounded,
                  color: colors.primary,
                  size: 36,
                ),
                const SizedBox(height: 14),
                Text(
                  policy.isRequired
                      ? 'Update required'
                      : 'A newer MathSolver is ready',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  policy.message ?? 'Update to get the latest improvements.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onUpdate,
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: const Text('Update MathSolver'),
                  ),
                ),
                if (onDismiss != null)
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: onDismiss,
                      child: const Text('Not now'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LaunchScreen extends StatelessWidget {
  const _LaunchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Semantics(
          label: 'MathSolver is opening',
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              borderRadius: BorderRadius.circular(22),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.functions_rounded,
              color: Theme.of(context).colorScheme.onPrimary,
              size: 34,
            ),
          ),
        ),
      ),
    );
  }
}

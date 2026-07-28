import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'core/auth/account_controller.dart';
import 'core/network/cloud_notebook_api.dart';
import 'core/network/mathsolver_api.dart';
import 'core/network/video_lesson_api.dart';
import 'core/storage/notebook_repository.dart';
import 'core/theme/app_theme.dart';
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

class _MathSolverAppState extends State<MathSolverApp> {
  late final AppController _controller;
  late final MathSolverApi _api;
  late final AccountController _account;
  late final VideoLessonApi _videoApi;
  late final CloudNotebookApi _cloudNotebook;
  final _navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription<RemoteMessage>? _notificationOpenSubscription;
  String? _syncedUserId;
  String? _pendingVideoJobId;
  var _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _controller = AppController(
      widget.repository ?? SharedPreferencesNotebookRepository(),
    );
    _api = widget.api ?? MathSolverApi();
    _account = AccountController();
    _videoApi = VideoLessonApi(account: _account);
    _cloudNotebook = CloudNotebookApi(account: _account);
    _controller.onSolutionAdded = _cloudNotebook.saveSolution;
    _controller.onSolutionRemoved = _cloudNotebook.deleteSolution;
    _account.addListener(_onAccountChanged);
    _controller.initialize().then((_) => _syncSignedInNotebook());
    _account.initialize().then((_) => _syncSignedInNotebook());
    if (Firebase.apps.isNotEmpty) {
      _notificationOpenSubscription = FirebaseMessaging.onMessageOpenedApp
          .listen(_handleNotificationOpen);
      FirebaseMessaging.instance.getInitialMessage().then((message) {
        if (message != null) _handleNotificationOpen(message);
      });
    }
  }

  @override
  void dispose() {
    _videoApi.close();
    _notificationOpenSubscription?.cancel();
    _account.removeListener(_onAccountChanged);
    _cloudNotebook.close();
    _account.dispose();
    _api.close();
    _controller.dispose();
    super.dispose();
  }

  void _onAccountChanged() {
    unawaited(_syncSignedInNotebook());
    _openPendingNotification();
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
    final navigator = _navigatorKey.currentState;
    if (jobId == null ||
        navigator == null ||
        !_controller.isReady ||
        !_controller.hasCompletedOnboarding ||
        !_account.isSignedIn) {
      return;
    }
    _pendingVideoJobId = null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      navigator.push<void>(
        MaterialPageRoute(
          builder: (context) => VideoStudioScreen(
            account: _account,
            api: _videoApi,
            existingJobId: jobId,
          ),
        ),
      );
    });
  }

  Future<void> _syncSignedInNotebook() async {
    final uid = _account.userId;
    if (!_account.isSignedIn || uid == null) {
      _syncedUserId = null;
      return;
    }
    if (_isSyncing || _syncedUserId == uid || !_controller.isReady) return;
    _isSyncing = true;
    try {
      final cloud = await _cloudNotebook.loadNotebook();
      await _controller.mergeCloudSolutions(cloud.solutions, cloud.deletions);
      for (final solution in _controller.solutions) {
        await _cloudNotebook.saveSolution(solution);
      }
      _syncedUserId = uid;
      _openPendingNotification();
    } on Object {
      // Local solving remains available; the next account notification retries.
    } finally {
      _isSyncing = false;
    }
  }

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

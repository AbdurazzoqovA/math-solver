import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/video_lesson_api.dart';
import 'package:mathsolver_mobile/features/video/domain/video_lesson.dart';
import 'package:mathsolver_mobile/features/video/presentation/video_studio_screen.dart';

void main() {
  testWidgets(
    'screen-off pauses polling and resume refreshes the same server job',
    (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      final account = _TestAccount(signedIn: true);
      final api = _FakeVideoLessonApi(account);
      final interruptedPoll = Completer<VideoJob>();
      api.createResponses.add(() async => _job(VideoJobStatus.planning));
      api.getResponses
        ..add(() => interruptedPoll.future)
        ..add(() async => _job(VideoJobStatus.rendering));

      await tester.pumpWidget(_app(account: account, api: api));
      await tester.pump();
      expect(api.createCalls, 1);

      await tester.pump(const Duration(seconds: 3));
      expect(api.getCalls, 1);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      interruptedPoll.completeError(const SocketException('screen is off'));
      await tester.pump();
      await tester.pump(const Duration(minutes: 1));
      expect(api.getCalls, 1);
      expect(find.text('The studio hit a snag'), findsNothing);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(api.getCalls, 2);
      expect(api.createCalls, 1);
      expect(find.text('Drawing the lesson'), findsOneWidget);
      expect(find.text('The studio hit a snag'), findsNothing);

      await tester.pumpWidget(const SizedBox.shrink());
      account.dispose();
      api.close();
    },
  );

  testWidgets(
    'library job retries transient status failures and keeps a manual retry',
    (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      final account = _TestAccount(signedIn: true);
      final api = _FakeVideoLessonApi(account);
      for (var index = 0; index < 5; index++) {
        api.getResponses.add(
          () => Future<VideoJob>.error(
            const SocketException('temporarily offline'),
          ),
        );
      }
      api.getResponses.add(() async => _job(VideoJobStatus.planning));

      await tester.pumpWidget(
        MaterialApp(
          home: VideoStudioScreen(
            account: account,
            api: api,
            existingJobId: _jobId,
          ),
        ),
      );
      await tester.pump();
      expect(
        find.text('Connection interrupted. Reconnecting automatically…'),
        findsOneWidget,
      );

      for (final delay in const [
        Duration(seconds: 3),
        Duration(seconds: 6),
        Duration(seconds: 12),
        Duration(seconds: 30),
      ]) {
        await tester.pump(delay);
      }
      await tester.pump();
      expect(api.getCalls, 5);
      expect(find.text('The studio hit a snag'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);

      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(api.getCalls, 6);
      expect(find.text('Designing the lesson'), findsOneWidget);
      expect(find.text('The studio hit a snag'), findsNothing);

      await tester.pumpWidget(const SizedBox.shrink());
      account.dispose();
      api.close();
    },
  );

  testWidgets(
    'a restored account starts a screen that opened while signed out',
    (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      final account = _TestAccount(signedIn: false);
      final api = _FakeVideoLessonApi(account)
        ..createResponses.add(() async => _job(VideoJobStatus.planning));

      await tester.pumpWidget(_app(account: account, api: api));
      await tester.pump();
      expect(api.createCalls, 0);
      expect(find.text('Sign in to make this video'), findsOneWidget);
      expect(tester.takeException(), isNull);

      account.setSignedIn(true);
      await tester.pump();
      expect(api.createCalls, 1);
      expect(find.text('Designing the lesson'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      account.dispose();
      api.close();
    },
  );

  testWidgets('switching accounts never recreates the previous private job', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    final account = _TestAccount(signedIn: true);
    final api = _FakeVideoLessonApi(account)
      ..createResponses.add(() async => _job(VideoJobStatus.planning));

    await tester.pumpWidget(_app(account: account, api: api));
    await tester.pump();
    expect(api.createCalls, 1);

    account.switchUser('other-user');
    await tester.pump();
    expect(api.createCalls, 1);
    expect(api.getCalls, 0);
    expect(
      find.textContaining('The signed-in account changed'),
      findsOneWidget,
    );
    expect(find.text('Try again'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
    account.dispose();
    api.close();
  });

  testWidgets('a short screen lock does not reload a ready video', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    final account = _TestAccount(signedIn: true);
    final api = _FakeVideoLessonApi(account)
      ..createResponses.add(() async => _job(VideoJobStatus.ready));

    await tester.pumpWidget(_app(account: account, api: api));
    await tester.pump();
    expect(api.createCalls, 1);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump(const Duration(seconds: 5));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();

    expect(api.getCalls, 0);
    expect(api.createCalls, 1);

    await tester.pumpWidget(const SizedBox.shrink());
    account.dispose();
    api.close();
  });
}

const _jobId = '1234567890abcdef1234567890abcdef12345678';

Widget _app({required _TestAccount account, required _FakeVideoLessonApi api}) {
  return MaterialApp(
    home: VideoStudioScreen(
      account: account,
      api: api,
      problem: '2 + 2',
      solution: '**Step 1:** Add to get 4.',
      requestKey: 'mobile-test-solution',
    ),
  );
}

VideoJob _job(VideoJobStatus status) {
  final now = DateTime(2026, 8, 25);
  return VideoJob(
    id: _jobId,
    status: status,
    progress: switch (status) {
      VideoJobStatus.planning => 15,
      VideoJobStatus.rendering => 48,
      _ => 2,
    },
    stageLabel: switch (status) {
      VideoJobStatus.planning => 'Designing the lesson',
      VideoJobStatus.rendering => 'Drawing the lesson',
      _ => 'Waiting for the video studio',
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: now.add(const Duration(days: 14)),
    quota: const VideoQuota(used: 1, limit: 10, remaining: 9),
  );
}

class _TestAccount extends AccountController {
  _TestAccount({required this.signedIn})
    : currentUserId = signedIn ? 'test-user' : null;

  bool signedIn;
  String? currentUserId;

  @override
  bool get isConfigured => true;

  @override
  bool get isSignedIn => signedIn;

  @override
  String? get userId => signedIn ? currentUserId : null;

  @override
  Future<String> getIdToken({String? expectedUserId}) async => 'test-token';

  void setSignedIn(bool value) {
    signedIn = value;
    currentUserId = value ? currentUserId ?? 'test-user' : null;
    notifyListeners();
  }

  void switchUser(String userId) {
    signedIn = true;
    currentUserId = userId;
    notifyListeners();
  }
}

class _FakeVideoLessonApi extends VideoLessonApi {
  _FakeVideoLessonApi(AccountController account) : super(account: account);

  final createResponses = <Future<VideoJob> Function()>[];
  final getResponses = <Future<VideoJob> Function()>[];
  var createCalls = 0;
  var getCalls = 0;

  @override
  Future<VideoJob> createJob({
    required String requestKey,
    required String problem,
    required String solution,
    String? expectedUserId,
  }) {
    createCalls++;
    return createResponses.removeAt(0)();
  }

  @override
  Future<VideoJob> getJob(String jobId, {String? expectedUserId}) {
    getCalls++;
    return getResponses.removeAt(0)();
  }

  @override
  Future<bool> shouldOfferReadyNotifications() async => false;
}

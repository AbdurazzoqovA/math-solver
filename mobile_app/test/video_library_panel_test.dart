import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/video_lesson_api.dart';
import 'package:mathsolver_mobile/core/storage/video_offline_cache.dart';
import 'package:mathsolver_mobile/features/video/domain/video_lesson.dart';
import 'package:mathsolver_mobile/features/video/presentation/video_library_panel.dart';

void main() {
  testWidgets('pauses polling and ignores a stale load after the app resumes', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    addTearDown(
      () => tester.binding.handleAppLifecycleStateChanged(
        AppLifecycleState.resumed,
      ),
    );

    final firstLoad = Completer<VideoJobList>();
    final resumedLoad = Completer<VideoJobList>();
    final account = _SignedInAccountController();
    final api = _FakeVideoLessonApi(
      account: account,
      responses: [() => firstLoad.future, () => resumedLoad.future],
    );
    addTearDown(api.close);
    addTearDown(account.dispose);

    await tester.pumpWidget(_testApp(account: account, api: api));
    expect(api.listCalls, 1);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump(const Duration(seconds: 10));
    expect(api.listCalls, 1);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(api.listCalls, 2);

    resumedLoad.complete(
      _library(title: 'Fresh lesson', status: VideoJobStatus.ready),
    );
    await tester.pump();
    expect(find.text('Fresh lesson'), findsOneWidget);

    firstLoad.complete(
      _library(title: 'Stale lesson', status: VideoJobStatus.rendering),
    );
    await tester.pump();
    expect(find.text('Fresh lesson'), findsOneWidget);
    expect(find.text('Stale lesson'), findsNothing);
  });

  testWidgets('retries an active library after a transient list failure', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    addTearDown(
      () => tester.binding.handleAppLifecycleStateChanged(
        AppLifecycleState.resumed,
      ),
    );

    final account = _SignedInAccountController();
    final api = _FakeVideoLessonApi(
      account: account,
      responses: [
        () async => _library(
          title: 'Rendering lesson',
          status: VideoJobStatus.rendering,
        ),
        () async => throw TimeoutException('temporary network loss'),
        () async =>
            _library(title: 'Rendering lesson', status: VideoJobStatus.ready),
      ],
    );
    addTearDown(api.close);
    addTearDown(account.dispose);

    await tester.pumpWidget(_testApp(account: account, api: api));
    await tester.pump();
    expect(api.listCalls, 1);
    expect(find.text('RENDERING'), findsOneWidget);

    await tester.pump(const Duration(seconds: 5));
    await tester.pump();
    expect(api.listCalls, 2);
    expect(find.text('RENDERING'), findsOneWidget);

    await tester.pump(const Duration(seconds: 4));
    expect(api.listCalls, 2);
    await tester.pump(const Duration(seconds: 1));
    await tester.pump();

    expect(api.listCalls, 3);
    expect(find.text('READY'), findsOneWidget);
  });

  testWidgets('cancels an active-job refresh timer while paused', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    addTearDown(
      () => tester.binding.handleAppLifecycleStateChanged(
        AppLifecycleState.resumed,
      ),
    );

    final account = _SignedInAccountController();
    final api = _FakeVideoLessonApi(
      account: account,
      responses: [
        () async => _library(
          title: 'Background lesson',
          status: VideoJobStatus.rendering,
        ),
        () async =>
            _library(title: 'Background lesson', status: VideoJobStatus.ready),
      ],
    );
    addTearDown(api.close);
    addTearDown(account.dispose);

    await tester.pumpWidget(_testApp(account: account, api: api));
    await tester.pump();
    expect(api.listCalls, 1);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump(const Duration(seconds: 10));
    expect(api.listCalls, 1);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(api.listCalls, 2);
    expect(find.text('READY'), findsOneWidget);
  });

  testWidgets('switching accounts replaces the private video library', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    final account = _SignedInAccountController();
    final api = _FakeVideoLessonApi(
      account: account,
      responses: [
        () async =>
            _library(title: 'Account A lesson', status: VideoJobStatus.ready),
        () async =>
            _library(title: 'Account B lesson', status: VideoJobStatus.ready),
      ],
    );
    addTearDown(api.close);
    addTearDown(account.dispose);

    await tester.pumpWidget(_testApp(account: account, api: api));
    await tester.pump();
    expect(find.text('Account A lesson'), findsOneWidget);

    account.switchUser('other-user');
    await tester.pump();
    expect(api.listCalls, 2);
    expect(find.text('Account A lesson'), findsNothing);
    expect(find.text('Account B lesson'), findsOneWidget);
  });

  testWidgets(
    'cold start lists and opens an owner-scoped saved lesson without network',
    (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      final account = _SignedInAccountController();
      final api = _FakeVideoLessonApi(
        account: account,
        responses: [
          () => Future<VideoJobList>.error(
            const SocketException('no connection'),
          ),
        ],
      );
      final requestedOwners = <String>[];
      addTearDown(api.close);
      addTearDown(account.dispose);

      await tester.pumpWidget(
        _testApp(
          account: account,
          api: api,
          offlineLessonsLoader: (ownerUserId) async {
            requestedOwners.add(ownerUserId);
            return [_offlineLesson(ownerUserId)];
          },
        ),
      );
      await tester.pump();

      expect(requestedOwners, ['test-user']);
      expect(find.text('Saved lesson'), findsOneWidget);
      expect(find.text('SAVED OFFLINE'), findsOneWidget);
      expect(
        find.text(
          'Online videos could not be refreshed. Saved lessons still work offline.',
        ),
        findsOneWidget,
      );

      await tester.tap(find.text('Saved lesson'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.text('Saved lesson'), findsWidgets);
      expect(find.text('Practice pauses'), findsOneWidget);
      expect(api.getCalls, 0);
    },
  );

  testWidgets('a ready remote card prefers its valid offline copy on tap', (
    tester,
  ) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    final account = _SignedInAccountController();
    final api = _FakeVideoLessonApi(
      account: account,
      responses: [
        () async => _library(
          title: 'Remote ready lesson',
          status: VideoJobStatus.ready,
        ),
      ],
    );
    addTearDown(api.close);
    addTearDown(account.dispose);

    await tester.pumpWidget(
      _testApp(
        account: account,
        api: api,
        offlineLessonsLoader: (ownerUserId) async => [
          _offlineLesson(ownerUserId),
        ],
      ),
    );
    await tester.pump();
    expect(find.text('Remote ready lesson'), findsOneWidget);

    await tester.tap(find.text('Remote ready lesson'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Practice pauses'), findsOneWidget);
    expect(api.getCalls, 0);
  });
}

Widget _testApp({
  required AccountController account,
  required VideoLessonApi api,
  Future<List<OfflineVideoLesson>> Function(String ownerUserId)?
  offlineLessonsLoader,
}) {
  return MaterialApp(
    home: Scaffold(
      body: VideoLibraryPanel(
        account: account,
        api: api,
        offlineLessonsLoader: offlineLessonsLoader,
      ),
    ),
  );
}

OfflineVideoLesson _offlineLesson(String ownerUserId) {
  const clip = VideoLessonClip(
    id: 'full-lesson',
    step: 1,
    title: 'Saved clip',
    durationSeconds: 12,
    videoUrl: 'https://unavailable.example/lesson.mp4',
    captionsUrl: '',
    posterUrl: '',
  );
  const check = VideoLessonInteraction(
    id: 'transfer',
    afterClip: 'full-lesson',
    eyebrow: 'Your turn',
    prompt: 'What is 2 + 2?',
    options: [VideoLessonOption(id: 'a', label: '4')],
    correctOptionId: 'a',
    correctFeedback: 'Correct.',
    incorrectFeedback: 'Try again.',
  );
  return OfflineVideoLesson(
    ownerUserId: ownerUserId,
    jobId: '1111111111111111111111111111111111111111',
    lesson: const VideoLessonManifest(
      lessonId: '1111111111111111111111111111111111111111',
      title: 'Saved lesson',
      problem: '2 + 2',
      learningGoal: 'Understand the saved explanation.',
      disclosure: 'Saved on this device.',
      clips: [clip],
      interactions: [],
      transferCheck: check,
      completionTitle: 'Done',
      completionBody: 'Complete.',
    ),
    savedClipIds: const {'full-lesson'},
    savedAt: DateTime.utc(2026, 8, 25),
  );
}

VideoJobList _library({required String title, required VideoJobStatus status}) {
  return VideoJobList(
    jobs: [
      VideoJobSummary(
        id: '1111111111111111111111111111111111111111',
        title: title,
        problem: '2 + 2',
        status: status,
        progress: status == VideoJobStatus.ready ? 100 : 50,
        stageLabel: status == VideoJobStatus.ready
            ? 'Ready to watch'
            : 'Rendering lesson',
        updatedAt: DateTime.utc(2026, 8, 25),
      ),
    ],
    quota: const VideoQuota(used: 1, limit: 10, remaining: 9),
  );
}

class _SignedInAccountController extends AccountController {
  String currentUserId = 'test-user';

  @override
  bool get isConfigured => true;

  @override
  bool get isSignedIn => true;

  @override
  String? get userId => currentUserId;

  void switchUser(String userId) {
    currentUserId = userId;
    notifyListeners();
  }
}

class _FakeVideoLessonApi extends VideoLessonApi {
  _FakeVideoLessonApi({required super.account, required this.responses});

  final List<Future<VideoJobList> Function()> responses;
  var listCalls = 0;
  var getCalls = 0;

  @override
  Future<VideoJobList> listJobs({String? expectedUserId}) {
    listCalls++;
    if (responses.isEmpty) {
      throw StateError('Unexpected video library request.');
    }
    return responses.removeAt(0)();
  }

  @override
  Future<VideoJob> getJob(String jobId, {String? expectedUserId}) {
    getCalls++;
    throw StateError('An offline lesson must not request the network.');
  }
}

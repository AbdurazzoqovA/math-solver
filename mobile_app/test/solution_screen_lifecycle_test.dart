import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/mathsolver_api.dart';
import 'package:mathsolver_mobile/core/network/video_lesson_api.dart';
import 'package:mathsolver_mobile/core/reviews/app_review_service.dart';
import 'package:mathsolver_mobile/core/storage/notebook_repository.dart';
import 'package:mathsolver_mobile/features/app/app_controller.dart';
import 'package:mathsolver_mobile/features/practice/domain/review_item.dart';
import 'package:mathsolver_mobile/features/solve/domain/math_review.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_record.dart';
import 'package:mathsolver_mobile/features/solve/presentation/solution_screen.dart';

void main() {
  testWidgets('disposed solution does not start verification after saving', (
    tester,
  ) async {
    final repository = _DelayedSaveRepository();
    final controller = AppController(repository);
    await controller.initialize();
    final api = _SolutionApi();
    final account = AccountController();
    final videoApi = VideoLessonApi(account: account);
    addTearDown(() {
      videoApi.close();
      account.dispose();
      api.close();
      controller.dispose();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: SolutionScreen(
          problem: 'x + 1 = 2',
          source: ProblemSource.typed,
          controller: controller,
          api: api,
          account: account,
          videoApi: videoApi,
        ),
      ),
    );
    await tester.pump();
    await tester.runAsync(
      () => repository.saveStarted.future.timeout(const Duration(seconds: 1)),
    );

    await tester.pumpWidget(const SizedBox.shrink());
    repository.finishSave.complete();
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pump();

    expect(api.verifyCalls, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'fifth checked solve waits for the full answer before requesting a review',
    (tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      addTearDown(
        () => tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        ),
      );
      await tester.binding.setSurfaceSize(const Size(800, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _ReviewRepository();
      final reviewRequester = _RecordingReviewRequester();
      final controller = AppController(
        repository,
        reviewRequester: reviewRequester,
      );
      await controller.initialize();
      final api = _SolutionApi(solution: _threeStepSolution);
      final account = AccountController();
      final videoApi = VideoLessonApi(account: account);
      addTearDown(() {
        videoApi.close();
        account.dispose();
        api.close();
        controller.dispose();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: SolutionScreen(
            problem: '2x + 1 = 7',
            source: ProblemSource.typed,
            controller: controller,
            api: api,
            account: account,
            videoApi: videoApi,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(controller.solutions, hasLength(5));
      expect(find.text('AI CHECKED'), findsOneWidget);
      expect(reviewRequester.verifiedSolveRequests, 0);

      await tester.pump(const Duration(seconds: 3));
      expect(reviewRequester.verifiedSolveRequests, 0);

      await tester.tap(find.text('Show all'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 1999));
      expect(reviewRequester.verifiedSolveRequests, 0);

      await tester.pump(const Duration(milliseconds: 2));
      expect(reviewRequester.verifiedSolveRequests, 1);
      expect(reviewRequester.lastSavedSolutionCount, 5);
    },
  );

  testWidgets('a verification warning never requests a review', (tester) async {
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    addTearDown(
      () => tester.binding.handleAppLifecycleStateChanged(
        AppLifecycleState.resumed,
      ),
    );
    await tester.binding.setSurfaceSize(const Size(800, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final reviewRequester = _RecordingReviewRequester();
    final controller = AppController(
      _ReviewRepository(),
      reviewRequester: reviewRequester,
    );
    await controller.initialize();
    final api = _SolutionApi(
      solution: _threeStepSolution,
      verificationStatus: SolutionVerificationStatus.warning,
    );
    final account = AccountController();
    final videoApi = VideoLessonApi(account: account);
    addTearDown(() {
      videoApi.close();
      account.dispose();
      api.close();
      controller.dispose();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: SolutionScreen(
          problem: '2x + 1 = 7',
          source: ProblemSource.typed,
          controller: controller,
          api: api,
          account: account,
          videoApi: videoApi,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Show all'));
    await tester.pump(const Duration(seconds: 3));

    expect(find.text('REVIEW'), findsOneWidget);
    expect(reviewRequester.verifiedSolveRequests, 0);
  });
}

class _SolutionApi extends MathSolverApi {
  _SolutionApi({
    this.solution = '**Step 1:** Subtract 1.\n\n**Final Answer:** 1',
    this.verificationStatus = SolutionVerificationStatus.checked,
  });

  final String solution;
  final SolutionVerificationStatus verificationStatus;
  var verifyCalls = 0;

  @override
  Stream<String> streamSolution({
    required List<Map<String, String>> messages,
    String? source,
  }) async* {
    yield solution;
  }

  @override
  Future<SolutionVerification> verifySolution({
    required String problem,
    required String solution,
  }) async {
    verifyCalls++;
    return SolutionVerification(
      status: verificationStatus,
      confidence: 1,
      summary: verificationStatus == SolutionVerificationStatus.checked
          ? 'Checked.'
          : 'Review this result.',
      issues: const [],
    );
  }
}

const _threeStepSolution = r'''
**Step 1: Subtract one**

Subtract 1 from both sides.

**Step 2: Simplify**

This gives $2x = 6$.

**Step 3: Divide**

Divide both sides by 2.

**Final Answer**

$x = 3$
''';

class _RecordingReviewRequester implements AppReviewRequester {
  var verifiedSolveRequests = 0;
  int? lastSavedSolutionCount;

  @override
  Future<void> requestAfterPractice({
    required int savedSolutionCount,
    required int score,
    required int questionCount,
  }) async {}

  @override
  Future<void> requestAfterVerifiedSolve({
    required int savedSolutionCount,
  }) async {
    verifiedSolveRequests++;
    lastSavedSolutionCount = savedSolutionCount;
  }
}

class _ReviewRepository extends _DelayedSaveRepository {
  _ReviewRepository()
    : solutions = List.generate(
        4,
        (index) => SolutionRecord(
          id: 'existing-$index',
          problem: 'x = $index',
          solution: '**Final Answer:** $index',
          createdAt: DateTime(2026, 8, 20 + index),
          source: ProblemSource.typed,
        ),
      );

  List<SolutionRecord> solutions;

  @override
  Future<List<SolutionRecord>> readSolutions({String? ownerId}) async =>
      solutions;

  @override
  Future<void> writeSolutions(
    List<SolutionRecord> values, {
    String? ownerId,
  }) async {
    solutions = List.of(values);
  }
}

class _DelayedSaveRepository implements NotebookRepository {
  final saveStarted = Completer<void>();
  final finishSave = Completer<void>();

  @override
  Future<void> clearOwnerLearningData(String ownerId) async {}

  @override
  Future<void> clearLearningData() async {}

  @override
  Future<bool> readAnalyticsEnabled() async => false;

  @override
  Future<bool> readLearningMode() async => true;

  @override
  Future<bool> readOnboardingComplete() async => true;

  @override
  Future<Map<String, DateTime>> readPendingSolutionDeletions({
    String? ownerId,
  }) async => const {};

  @override
  Future<List<ReviewItem>> readReviewItems({String? ownerId}) async => const [];

  @override
  Future<List<SolutionRecord>> readSolutions({String? ownerId}) async =>
      const [];

  @override
  Future<ThemeMode> readThemeMode() async => ThemeMode.light;

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {}

  @override
  Future<void> writeLearningMode(bool value) async {}

  @override
  Future<void> writeOnboardingComplete(bool value) async {}

  @override
  Future<void> writePendingSolutionDeletions(
    Map<String, DateTime> deletions, {
    String? ownerId,
  }) async {}

  @override
  Future<void> writeReviewItems(
    List<ReviewItem> items, {
    String? ownerId,
  }) async {}

  @override
  Future<void> writeSolutions(
    List<SolutionRecord> solutions, {
    String? ownerId,
  }) async {
    if (!saveStarted.isCompleted) saveStarted.complete();
    await finishSave.future;
  }

  @override
  Future<void> writeThemeMode(ThemeMode mode) async {}
}

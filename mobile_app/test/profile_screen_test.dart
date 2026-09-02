import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/video_lesson_api.dart';
import 'package:mathsolver_mobile/core/storage/notebook_repository.dart';
import 'package:mathsolver_mobile/features/app/app_controller.dart';
import 'package:mathsolver_mobile/features/practice/domain/review_item.dart';
import 'package:mathsolver_mobile/features/profile/profile_screen.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_record.dart';
import 'package:package_info_plus/package_info_plus.dart';

void main() {
  test('account cleanup attempts every local store after a failure', () async {
    final attempts = <String>[];

    final complete = await performLocalAccountCleanup(
      clearOfflineVideos: () async {
        attempts.add('videos');
        throw StateError('disk unavailable');
      },
      clearNotebook: () async {
        attempts.add('notebook');
      },
      clearNotificationPreferences: () async {
        attempts.add('notifications');
      },
    );

    expect(complete, isFalse);
    expect(attempts, ['videos', 'notebook', 'notifications']);
  });

  testWidgets('about sheet shows only MathSolver product information', (
    tester,
  ) async {
    PackageInfo.setMockInitialValues(
      appName: 'MathSolver',
      packageName: 'io.mathsolver.app',
      version: '1.0.0',
      buildNumber: '1',
      buildSignature: '',
    );
    final controller = AppController(_EmptyRepository());
    await controller.initialize();
    final account = _SignedInAccountController();
    final videoApi = VideoLessonApi(account: account);
    addTearDown(() {
      videoApi.close();
      account.dispose();
      controller.dispose();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(
          controller: controller,
          account: account,
          videoApi: videoApi,
        ),
      ),
    );

    await tester.scrollUntilVisible(find.text('About MathSolver'), 400);
    await tester.tap(find.text('About MathSolver'));
    await tester.pumpAndSettle();

    expect(find.text('MathSolver'), findsOneWidget);
    expect(find.text('Version 1.0.0 (1)'), findsOneWidget);
    expect(find.textContaining('Completely free.'), findsOneWidget);
    expect(find.text('View licenses'), findsNothing);
    expect(find.text('Done'), findsOneWidget);
  });

  testWidgets('account deletion dialog can be cancelled safely', (
    tester,
  ) async {
    final controller = AppController(_EmptyRepository());
    await controller.initialize();
    final account = _SignedInAccountController();
    final videoApi = VideoLessonApi(account: account);
    addTearDown(() {
      videoApi.close();
      account.dispose();
      controller.dispose();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(
          controller: controller,
          account: account,
          videoApi: videoApi,
        ),
      ),
    );

    await tester.tap(find.text('Delete account and data'));
    await tester.pumpAndSettle();
    expect(find.text('Delete your account?'), findsOneWidget);

    await tester.tap(find.text('Keep account'));
    await tester.pumpAndSettle();

    expect(find.text('Delete your account?'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

class _SignedInAccountController extends AccountController {
  @override
  bool get isBusy => false;

  @override
  bool get isSignedIn => true;

  @override
  String? get email => 'qa@example.com';
}

class _EmptyRepository implements NotebookRepository {
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
  Future<List<ReviewItem>> readReviewItems({String? ownerId}) async => const [];

  @override
  Future<List<SolutionRecord>> readSolutions({String? ownerId}) async =>
      const [];

  @override
  Future<Map<String, DateTime>> readPendingSolutionDeletions({
    String? ownerId,
  }) async => const {};

  @override
  Future<ThemeMode> readThemeMode() async => ThemeMode.light;

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {}

  @override
  Future<void> writeLearningMode(bool value) async {}

  @override
  Future<void> writeOnboardingComplete(bool value) async {}

  @override
  Future<void> writeReviewItems(
    List<ReviewItem> items, {
    String? ownerId,
  }) async {}

  @override
  Future<void> writePendingSolutionDeletions(
    Map<String, DateTime> deletions, {
    String? ownerId,
  }) async {}

  @override
  Future<void> writeSolutions(
    List<SolutionRecord> solutions, {
    String? ownerId,
  }) async {}

  @override
  Future<void> writeThemeMode(ThemeMode mode) async {}
}

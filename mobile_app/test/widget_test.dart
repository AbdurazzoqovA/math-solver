import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/app.dart';
import 'package:mathsolver_mobile/core/storage/notebook_repository.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_record.dart';
import 'package:mathsolver_mobile/features/practice/domain/review_item.dart';

void main() {
  testWidgets('onboarding is one screen and requires age confirmation', (
    tester,
  ) async {
    final repository = _MemoryRepository();
    await tester.pumpWidget(MathSolverApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.text('Math finally\nclicks.'), findsOneWidget);
    expect(find.text('I am 13 or older'), findsOneWidget);

    var startButton = tester.widget<FilledButton>(
      find.byKey(const Key('onboarding-continue')),
    );
    expect(startButton.onPressed, isNull);

    await tester.ensureVisible(find.text('I am 13 or older'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    startButton = tester.widget<FilledButton>(
      find.byKey(const Key('onboarding-continue')),
    );
    expect(startButton.onPressed, isNotNull);

    await tester.ensureVisible(find.byKey(const Key('onboarding-continue')));
    await tester.tap(find.byKey(const Key('onboarding-continue')));
    await tester.pumpAndSettle();
    expect(repository.onboardingComplete, isTrue);
    expect(find.text('What are we\nsolving?'), findsOneWidget);
  });
}

class _MemoryRepository implements NotebookRepository {
  bool onboardingComplete = false;
  ThemeMode mode = ThemeMode.light;
  bool learningMode = true;
  bool analyticsEnabled = false;
  List<SolutionRecord> solutions = [];

  @override
  Future<bool> readLearningMode() async => learningMode;

  @override
  Future<bool> readAnalyticsEnabled() async => analyticsEnabled;

  @override
  Future<bool> readOnboardingComplete() async => onboardingComplete;

  @override
  Future<List<SolutionRecord>> readSolutions() async => solutions;

  @override
  Future<List<ReviewItem>> readReviewItems() async => const [];

  @override
  Future<ThemeMode> readThemeMode() async => mode;

  @override
  Future<void> writeLearningMode(bool value) async {
    learningMode = value;
  }

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {
    analyticsEnabled = value;
  }

  @override
  Future<void> writeOnboardingComplete(bool value) async {
    onboardingComplete = value;
  }

  @override
  Future<void> writeSolutions(List<SolutionRecord> value) async {
    solutions = value;
  }

  @override
  Future<void> writeReviewItems(List<ReviewItem> items) async {}

  @override
  Future<void> writeThemeMode(ThemeMode value) async {
    mode = value;
  }
}

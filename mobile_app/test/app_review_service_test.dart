import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/reviews/app_review_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test(
    'requests after a strong practice milestone and enforces cooldown',
    () async {
      final gateway = _FakeReviewGateway();
      var now = DateTime(2026, 8, 26);
      final service = AppReviewService(gateway: gateway, now: () => now);

      await service.requestAfterPractice(
        savedSolutionCount: 3,
        score: 3,
        questionCount: 4,
      );
      await service.requestAfterPractice(
        savedSolutionCount: 10,
        score: 4,
        questionCount: 4,
      );
      await service.requestAfterVerifiedSolve(savedSolutionCount: 10);

      expect(gateway.requestCount, 1);

      now = now.add(const Duration(days: 121));
      await service.requestAfterVerifiedSolve(savedSolutionCount: 10);

      expect(gateway.requestCount, 2);
    },
  );

  test('does not request before enough use or after a weak quiz', () async {
    final gateway = _FakeReviewGateway();
    final service = AppReviewService(gateway: gateway);

    await service.requestAfterPractice(
      savedSolutionCount: 2,
      score: 4,
      questionCount: 4,
    );
    await service.requestAfterPractice(
      savedSolutionCount: 3,
      score: 2,
      questionCount: 4,
    );
    await service.requestAfterPractice(
      savedSolutionCount: 3,
      score: 3,
      questionCount: 3,
    );

    expect(gateway.requestCount, 0);
  });

  test('requests only from the fifth verified solve onward', () async {
    final gateway = _FakeReviewGateway();
    final service = AppReviewService(gateway: gateway);

    await service.requestAfterVerifiedSolve(savedSolutionCount: 4);
    expect(gateway.requestCount, 0);

    await service.requestAfterVerifiedSolve(savedSolutionCount: 5);
    expect(gateway.requestCount, 1);
  });

  test(
    'an unavailable native review flow does not consume the cooldown',
    () async {
      final gateway = _FakeReviewGateway(available: false);
      final service = AppReviewService(gateway: gateway);

      await service.requestAfterPractice(
        savedSolutionCount: 3,
        score: 4,
        questionCount: 4,
      );
      gateway.available = true;
      await service.requestAfterPractice(
        savedSolutionCount: 3,
        score: 4,
        questionCount: 4,
      );

      expect(gateway.requestCount, 1);
    },
  );
}

class _FakeReviewGateway implements NativeAppReviewGateway {
  _FakeReviewGateway({this.available = true});

  bool available;
  var requestCount = 0;

  @override
  Future<bool> isAvailable() async => available;

  @override
  Future<void> requestReview() async {
    requestCount++;
  }
}

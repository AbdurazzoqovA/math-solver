import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract interface class AppReviewRequester {
  Future<void> requestAfterPractice({
    required int savedSolutionCount,
    required int score,
    required int questionCount,
  });

  Future<void> requestAfterVerifiedSolve({required int savedSolutionCount});
}

abstract interface class NativeAppReviewGateway {
  Future<bool> isAvailable();

  Future<void> requestReview();
}

class InAppReviewGateway implements NativeAppReviewGateway {
  InAppReviewGateway({InAppReview? review})
    : _review = review ?? InAppReview.instance;

  final InAppReview _review;

  @override
  Future<bool> isAvailable() => _review.isAvailable();

  @override
  Future<void> requestReview() => _review.requestReview();
}

abstract final class AppReviewPolicy {
  static const minimumPracticeSavedSolutions = 3;
  static const minimumVerifiedSolveCount = 5;
  static const minimumQuestionCount = 4;
  static const cooldown = Duration(days: 120);

  static bool isPracticeEligible({
    required int savedSolutionCount,
    required int score,
    required int questionCount,
  }) {
    return savedSolutionCount >= minimumPracticeSavedSolutions &&
        questionCount >= minimumQuestionCount &&
        score * 4 >= questionCount * 3;
  }

  static bool isVerifiedSolveEligible({required int savedSolutionCount}) =>
      savedSolutionCount >= minimumVerifiedSolveCount;
}

class AppReviewService implements AppReviewRequester {
  AppReviewService({
    NativeAppReviewGateway? gateway,
    Future<SharedPreferences> Function()? preferences,
    DateTime Function()? now,
  }) : _gateway = gateway ?? InAppReviewGateway(),
       _preferences = preferences ?? SharedPreferences.getInstance,
       _now = now ?? DateTime.now;

  static const _lastRequestAtKey = 'mathsolver.review.last-request-at.v1';

  final NativeAppReviewGateway _gateway;
  final Future<SharedPreferences> Function() _preferences;
  final DateTime Function() _now;
  var _requestInFlight = false;

  @override
  Future<void> requestAfterPractice({
    required int savedSolutionCount,
    required int score,
    required int questionCount,
  }) async {
    await _requestIfEligible(
      AppReviewPolicy.isPracticeEligible(
        savedSolutionCount: savedSolutionCount,
        score: score,
        questionCount: questionCount,
      ),
    );
  }

  @override
  Future<void> requestAfterVerifiedSolve({
    required int savedSolutionCount,
  }) async {
    await _requestIfEligible(
      AppReviewPolicy.isVerifiedSolveEligible(
        savedSolutionCount: savedSolutionCount,
      ),
    );
  }

  Future<void> _requestIfEligible(bool isEligible) async {
    if (_requestInFlight || !isEligible) {
      return;
    }

    _requestInFlight = true;
    try {
      final preferences = await _preferences();
      final now = _now();
      final lastRequestAt = preferences.getInt(_lastRequestAtKey);
      if (lastRequestAt != null &&
          now.millisecondsSinceEpoch - lastRequestAt <
              AppReviewPolicy.cooldown.inMilliseconds) {
        return;
      }
      if (!await _gateway.isAvailable()) return;

      final requestAt = now.millisecondsSinceEpoch;
      await preferences.setInt(_lastRequestAtKey, requestAt);
      try {
        await _gateway.requestReview();
      } on Object {
        if (preferences.getInt(_lastRequestAtKey) == requestAt) {
          await preferences.remove(_lastRequestAtKey);
        }
      }
    } on Object {
      // A rating request must never interrupt solving, practice, or navigation.
    } finally {
      _requestInFlight = false;
    }
  }
}

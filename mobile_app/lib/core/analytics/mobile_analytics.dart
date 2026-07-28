import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';

abstract final class MobileAnalytics {
  static bool _enabled = false;

  static Future<void> setEnabled(bool value) async {
    _enabled = value;
    if (Firebase.apps.isEmpty) return;
    try {
      await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(value);
    } on FirebaseException {
      // Analytics must never interrupt solving or local persistence.
    }
  }

  static Future<void> learningActivity(String activity) {
    assert(
      activity == 'solve' || activity == 'practice' || activity == 'review',
    );
    return _event('learning_activity', {'activity': activity});
  }

  static Future<void> mistakeSaved() => _event('mistake_saved');

  static Future<void> reviewQueueStarted({
    required int questionCount,
    required String source,
  }) {
    return _event('review_queue_started', {
      'question_count': questionCount.clamp(0, 5),
      'source': source,
    });
  }

  static Future<void> videoLessonRequested() =>
      _event('video_lesson_requested');

  static Future<void> videoLessonReady() => _event('video_lesson_ready');

  static Future<void> _event(
    String name, [
    Map<String, Object>? parameters,
  ]) async {
    if (!_enabled || Firebase.apps.isEmpty) return;
    try {
      await FirebaseAnalytics.instance.logEvent(
        name: name,
        parameters: parameters,
      );
    } on FirebaseException {
      // No analytics failure is user-facing.
    }
  }
}

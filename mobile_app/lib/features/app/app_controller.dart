import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/analytics/mobile_analytics.dart';
import '../../core/storage/notebook_repository.dart';
import '../practice/domain/practice_set.dart';
import '../practice/domain/review_item.dart';
import '../solve/domain/solution_record.dart';

class AppController extends ChangeNotifier {
  AppController(this._repository);

  final NotebookRepository _repository;
  Future<void> Function(SolutionRecord record)? onSolutionAdded;
  Future<void> Function(String id)? onSolutionRemoved;

  bool _isReady = false;
  bool _hasCompletedOnboarding = false;
  bool _learningMode = true;
  ThemeMode _themeMode = ThemeMode.light;
  bool _analyticsEnabled = false;
  List<SolutionRecord> _solutions = const [];
  List<ReviewItem> _reviewItems = const [];

  bool get isReady => _isReady;
  bool get hasCompletedOnboarding => _hasCompletedOnboarding;
  bool get learningMode => _learningMode;
  ThemeMode get themeMode => _themeMode;
  bool get analyticsEnabled => _analyticsEnabled;
  List<SolutionRecord> get solutions => List.unmodifiable(_solutions);
  List<ReviewItem> get reviewItems => List.unmodifiable(_reviewItems);
  List<ReviewItem> get dueReviewItems {
    final due = _reviewItems.where((item) => item.isDue()).toList();
    due.sort((left, right) => left.dueAt.compareTo(right.dueAt));
    return List.unmodifiable(due);
  }

  DateTime? get nextReviewAt {
    if (_reviewItems.isEmpty) return null;
    final values = _reviewItems.map((item) => item.dueAt).toList()..sort();
    return values.first;
  }

  SolutionRecord? get latestSolution =>
      _solutions.isEmpty ? null : _solutions.first;

  int get solvedToday {
    final now = DateTime.now();
    return _solutions.where((record) {
      final date = record.createdAt;
      return date.year == now.year &&
          date.month == now.month &&
          date.day == now.day;
    }).length;
  }

  int get streakDays {
    if (_solutions.isEmpty) {
      return 0;
    }
    final dates = _solutions
        .map(
          (record) => DateTime(
            record.createdAt.year,
            record.createdAt.month,
            record.createdAt.day,
          ),
        )
        .toSet();
    var cursor = DateTime.now();
    cursor = DateTime(cursor.year, cursor.month, cursor.day);
    if (!dates.contains(cursor)) {
      cursor = cursor.subtract(const Duration(days: 1));
    }
    var streak = 0;
    while (dates.contains(cursor)) {
      streak++;
      cursor = cursor.subtract(const Duration(days: 1));
    }
    return streak;
  }

  Future<void> initialize() async {
    final values = await Future.wait<Object>([
      _repository.readOnboardingComplete(),
      _repository.readSolutions(),
      _repository.readThemeMode(),
      _repository.readLearningMode(),
      _repository.readReviewItems(),
      _repository.readAnalyticsEnabled(),
    ]);
    _hasCompletedOnboarding = values[0] as bool;
    _solutions = List<SolutionRecord>.of(values[1] as List<SolutionRecord>)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    _themeMode = values[2] as ThemeMode;
    _learningMode = values[3] as bool;
    _reviewItems = List<ReviewItem>.of(values[4] as List<ReviewItem>);
    _analyticsEnabled = values[5] as bool;
    await MobileAnalytics.setEnabled(_analyticsEnabled);
    _isReady = true;
    notifyListeners();
  }

  Future<void> completeOnboarding() async {
    _hasCompletedOnboarding = true;
    notifyListeners();
    await _repository.writeOnboardingComplete(true);
  }

  Future<void> addSolution(SolutionRecord record) async {
    _solutions = [
      record,
      ..._solutions.where((item) => item.id != record.id),
    ].take(100).toList(growable: false);
    notifyListeners();
    await _repository.writeSolutions(_solutions);
    unawaited(MobileAnalytics.learningActivity('solve'));
    try {
      await onSolutionAdded?.call(record);
    } on Object {
      // The local notebook is authoritative while cloud sync is unavailable.
    }
  }

  Future<void> removeSolution(String id) async {
    _solutions = _solutions
        .where((record) => record.id != id)
        .toList(growable: false);
    notifyListeners();
    await _repository.writeSolutions(_solutions);
    try {
      await onSolutionRemoved?.call(id);
    } on Object {
      // Preserve the local deletion and retry cloud convergence at next sign-in.
    }
  }

  Future<void> mergeCloudSolutions(
    List<SolutionRecord> cloudSolutions,
    Map<String, DateTime> deletions,
  ) async {
    final merged = <String, SolutionRecord>{};
    for (final record in [..._solutions, ...cloudSolutions]) {
      final deletedAt = deletions[record.id];
      if (deletedAt != null && !record.createdAt.isAfter(deletedAt)) continue;
      final existing = merged[record.id];
      if (existing == null || record.createdAt.isAfter(existing.createdAt)) {
        merged[record.id] = record;
      }
    }
    _solutions = merged.values.toList()
      ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
    if (_solutions.length > 100) {
      _solutions = _solutions.take(100).toList(growable: false);
    }
    notifyListeners();
    await _repository.writeSolutions(_solutions);
  }

  Future<void> recordPracticeAnswer({
    required PracticeQuestion question,
    required bool correct,
    required String sourceProblem,
  }) async {
    final id = question.id;
    final existingIndex = id == null
        ? -1
        : _reviewItems.indexWhere((item) => item.id == id);
    if (existingIndex >= 0) {
      unawaited(MobileAnalytics.learningActivity('review'));
      _reviewItems = [
        for (var index = 0; index < _reviewItems.length; index++)
          if (index == existingIndex)
            _reviewItems[index].schedule(correct: correct)
          else
            _reviewItems[index],
      ];
    } else if (!correct) {
      final duplicate = _reviewItems.any(
        (item) => item.question.question == question.question,
      );
      if (duplicate) return;
      final now = DateTime.now();
      final reviewId =
          'review-${now.microsecondsSinceEpoch}-${question.question.hashCode.abs()}';
      _reviewItems = [
        ReviewItem.initial(
          id: reviewId,
          question: question,
          sourceProblem: sourceProblem,
          now: now,
        ),
        ..._reviewItems,
      ].take(100).toList(growable: false);
      unawaited(MobileAnalytics.mistakeSaved());
    } else {
      unawaited(MobileAnalytics.learningActivity('practice'));
      return;
    }
    if (existingIndex < 0) {
      unawaited(MobileAnalytics.learningActivity('practice'));
    }
    notifyListeners();
    await _repository.writeReviewItems(_reviewItems);
  }

  Future<void> removeReviewItem(String id) async {
    _reviewItems = _reviewItems
        .where((item) => item.id != id)
        .toList(growable: false);
    notifyListeners();
    await _repository.writeReviewItems(_reviewItems);
  }

  Future<void> setThemeMode(ThemeMode value) async {
    _themeMode = value;
    notifyListeners();
    await _repository.writeThemeMode(value);
  }

  Future<void> setLearningMode(bool value) async {
    _learningMode = value;
    notifyListeners();
    await _repository.writeLearningMode(value);
  }

  Future<void> setAnalyticsEnabled(bool value) async {
    _analyticsEnabled = value;
    notifyListeners();
    await _repository.writeAnalyticsEnabled(value);
    await MobileAnalytics.setEnabled(value);
  }
}

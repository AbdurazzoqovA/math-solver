import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/practice/domain/review_item.dart';
import '../../features/solve/domain/solution_record.dart';

abstract interface class NotebookRepository {
  Future<bool> readOnboardingComplete();

  Future<void> writeOnboardingComplete(bool value);

  Future<List<SolutionRecord>> readSolutions();

  Future<void> writeSolutions(List<SolutionRecord> solutions);

  Future<List<ReviewItem>> readReviewItems();

  Future<void> writeReviewItems(List<ReviewItem> items);

  Future<ThemeMode> readThemeMode();

  Future<void> writeThemeMode(ThemeMode mode);

  Future<bool> readLearningMode();

  Future<void> writeLearningMode(bool value);

  Future<bool> readAnalyticsEnabled();

  Future<void> writeAnalyticsEnabled(bool value);
}

class SharedPreferencesNotebookRepository implements NotebookRepository {
  static const _onboardingKey = 'mathsolver.onboarding.v1';
  static const _solutionsKey = 'mathsolver.notebook.v1';
  static const _themeKey = 'mathsolver.theme.v1';
  static const _learningModeKey = 'mathsolver.learning-mode.v1';
  static const _reviewItemsKey = 'mathsolver.review-items.v1';
  static const _analyticsEnabledKey = 'mathsolver.analytics-enabled.v1';

  Future<SharedPreferences> get _preferences => SharedPreferences.getInstance();

  @override
  Future<bool> readOnboardingComplete() async {
    return (await _preferences).getBool(_onboardingKey) ?? false;
  }

  @override
  Future<void> writeOnboardingComplete(bool value) async {
    await (await _preferences).setBool(_onboardingKey, value);
  }

  @override
  Future<List<SolutionRecord>> readSolutions() async {
    final raw = (await _preferences).getString(_solutionsKey);
    if (raw == null || raw.isEmpty) {
      return const [];
    }
    try {
      final values = jsonDecode(raw);
      if (values is! List<Object?>) {
        return const [];
      }
      return values
          .whereType<Map<String, Object?>>()
          .map(SolutionRecord.fromJson)
          .toList(growable: false);
    } on Object {
      return const [];
    }
  }

  @override
  Future<void> writeSolutions(List<SolutionRecord> solutions) async {
    final value = jsonEncode(
      solutions.map((record) => record.toJson()).toList(growable: false),
    );
    await (await _preferences).setString(_solutionsKey, value);
  }

  @override
  Future<List<ReviewItem>> readReviewItems() async {
    final raw = (await _preferences).getString(_reviewItemsKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final values = jsonDecode(raw);
      if (values is! List<Object?>) return const [];
      return values
          .whereType<Map<String, Object?>>()
          .map(ReviewItem.fromJson)
          .toList(growable: false);
    } on Object {
      return const [];
    }
  }

  @override
  Future<void> writeReviewItems(List<ReviewItem> items) async {
    await (await _preferences).setString(
      _reviewItemsKey,
      jsonEncode(items.map((item) => item.toJson()).toList(growable: false)),
    );
  }

  @override
  Future<ThemeMode> readThemeMode() async {
    final stored = (await _preferences).getString(_themeKey);
    return ThemeMode.values.firstWhere(
      (mode) => mode.name == stored,
      orElse: () => ThemeMode.light,
    );
  }

  @override
  Future<void> writeThemeMode(ThemeMode mode) async {
    await (await _preferences).setString(_themeKey, mode.name);
  }

  @override
  Future<bool> readLearningMode() async {
    return (await _preferences).getBool(_learningModeKey) ?? true;
  }

  @override
  Future<void> writeLearningMode(bool value) async {
    await (await _preferences).setBool(_learningModeKey, value);
  }

  @override
  Future<bool> readAnalyticsEnabled() async {
    return (await _preferences).getBool(_analyticsEnabledKey) ?? false;
  }

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {
    await (await _preferences).setBool(_analyticsEnabledKey, value);
  }
}

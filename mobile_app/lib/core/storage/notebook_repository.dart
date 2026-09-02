import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/practice/domain/review_item.dart';
import '../../features/solve/domain/solution_record.dart';

abstract interface class NotebookRepository {
  Future<bool> readOnboardingComplete();

  Future<void> writeOnboardingComplete(bool value);

  Future<List<SolutionRecord>> readSolutions({String? ownerId});

  Future<void> writeSolutions(
    List<SolutionRecord> solutions, {
    String? ownerId,
  });

  Future<List<ReviewItem>> readReviewItems({String? ownerId});

  Future<void> writeReviewItems(List<ReviewItem> items, {String? ownerId});

  Future<Map<String, DateTime>> readPendingSolutionDeletions({String? ownerId});

  Future<void> writePendingSolutionDeletions(
    Map<String, DateTime> deletions, {
    String? ownerId,
  });

  Future<ThemeMode> readThemeMode();

  Future<void> writeThemeMode(ThemeMode mode);

  Future<bool> readLearningMode();

  Future<void> writeLearningMode(bool value);

  Future<bool> readAnalyticsEnabled();

  Future<void> writeAnalyticsEnabled(bool value);

  Future<void> clearOwnerLearningData(String ownerId);

  Future<void> clearLearningData();
}

class SharedPreferencesNotebookRepository implements NotebookRepository {
  static const _onboardingKey = 'mathsolver.onboarding.v1';
  static const _legacySolutionsKey = 'mathsolver.notebook.v1';
  static const _guestSolutionsKey = 'mathsolver.notebook.guest.v2';
  static const _userSolutionsKeyPrefix = 'mathsolver.notebook.user.v2.';
  static const _themeKey = 'mathsolver.theme.v1';
  static const _learningModeKey = 'mathsolver.learning-mode.v1';
  static const _legacyReviewItemsKey = 'mathsolver.review-items.v1';
  static const _guestReviewItemsKey = 'mathsolver.review-items.guest.v2';
  static const _userReviewItemsKeyPrefix = 'mathsolver.review-items.user.v2.';
  static const _userDeletionOutboxKeyPrefix =
      'mathsolver.notebook-deletions.user.v2.';
  static const _analyticsEnabledKey = 'mathsolver.analytics-enabled.v1';

  static String _ownerKey(
    String guestKey,
    String userKeyPrefix,
    String? ownerId,
  ) {
    if (ownerId == null || ownerId.isEmpty) return guestKey;
    final encoded = base64Url.encode(utf8.encode(ownerId)).replaceAll('=', '');
    return '$userKeyPrefix$encoded';
  }

  static String? _userKey(String prefix, String? ownerId) {
    if (ownerId == null || ownerId.isEmpty) return null;
    final encoded = base64Url.encode(utf8.encode(ownerId)).replaceAll('=', '');
    return '$prefix$encoded';
  }

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
  Future<List<SolutionRecord>> readSolutions({String? ownerId}) async {
    final raw = (await _preferences).getString(
      _ownerKey(_guestSolutionsKey, _userSolutionsKeyPrefix, ownerId),
    );
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
  Future<void> writeSolutions(
    List<SolutionRecord> solutions, {
    String? ownerId,
  }) async {
    final value = jsonEncode(
      solutions.map((record) => record.toJson()).toList(growable: false),
    );
    await (await _preferences).setString(
      _ownerKey(_guestSolutionsKey, _userSolutionsKeyPrefix, ownerId),
      value,
    );
  }

  @override
  Future<List<ReviewItem>> readReviewItems({String? ownerId}) async {
    final raw = (await _preferences).getString(
      _ownerKey(_guestReviewItemsKey, _userReviewItemsKeyPrefix, ownerId),
    );
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
  Future<void> writeReviewItems(
    List<ReviewItem> items, {
    String? ownerId,
  }) async {
    await (await _preferences).setString(
      _ownerKey(_guestReviewItemsKey, _userReviewItemsKeyPrefix, ownerId),
      jsonEncode(items.map((item) => item.toJson()).toList(growable: false)),
    );
  }

  @override
  Future<Map<String, DateTime>> readPendingSolutionDeletions({
    String? ownerId,
  }) async {
    final key = _userKey(_userDeletionOutboxKeyPrefix, ownerId);
    if (key == null) return const {};
    final raw = (await _preferences).getString(key);
    if (raw == null || raw.isEmpty) return const {};
    try {
      final value = jsonDecode(raw);
      if (value is! Map<String, Object?>) return const {};
      return {
        for (final entry in value.entries)
          if (entry.value is int)
            entry.key: DateTime.fromMillisecondsSinceEpoch(entry.value! as int),
      };
    } on Object {
      return const {};
    }
  }

  @override
  Future<void> writePendingSolutionDeletions(
    Map<String, DateTime> deletions, {
    String? ownerId,
  }) async {
    final key = _userKey(_userDeletionOutboxKeyPrefix, ownerId);
    if (key == null) return;
    final preferences = await _preferences;
    if (deletions.isEmpty) {
      await preferences.remove(key);
      return;
    }
    await preferences.setString(
      key,
      jsonEncode({
        for (final entry in deletions.entries)
          entry.key: entry.value.millisecondsSinceEpoch,
      }),
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

  @override
  Future<void> clearOwnerLearningData(String ownerId) async {
    if (ownerId.isEmpty) return;
    final encoded = base64Url.encode(utf8.encode(ownerId)).replaceAll('=', '');
    final preferences = await _preferences;
    await Future.wait([
      preferences.remove('$_userSolutionsKeyPrefix$encoded'),
      preferences.remove('$_userReviewItemsKeyPrefix$encoded'),
      preferences.remove('$_userDeletionOutboxKeyPrefix$encoded'),
      // These exact per-owner keys were used by pre-v2 development builds.
      preferences.remove('$_legacySolutionsKey.user.$encoded'),
      preferences.remove('$_legacyReviewItemsKey.user.$encoded'),
    ]);
  }

  @override
  Future<void> clearLearningData() async {
    final preferences = await _preferences;
    final learningKeys = preferences.getKeys().where(
      (key) =>
          key == _legacySolutionsKey ||
          key == _guestSolutionsKey ||
          key.startsWith(_userSolutionsKeyPrefix) ||
          key.startsWith('$_legacySolutionsKey.user.') ||
          key == _legacyReviewItemsKey ||
          key == _guestReviewItemsKey ||
          key.startsWith(_userReviewItemsKeyPrefix) ||
          key.startsWith('$_legacyReviewItemsKey.user.') ||
          key.startsWith(_userDeletionOutboxKeyPrefix) ||
          key == _analyticsEnabledKey,
    );
    await Future.wait(learningKeys.map(preferences.remove));
  }
}

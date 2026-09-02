import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/analytics/mobile_analytics.dart';
import '../../core/reviews/app_review_service.dart';
import '../../core/storage/notebook_repository.dart';
import '../practice/domain/practice_set.dart';
import '../practice/domain/review_item.dart';
import '../solve/domain/solution_record.dart';

class AppController extends ChangeNotifier {
  AppController(this._repository, {this.reviewRequester});

  final NotebookRepository _repository;
  final AppReviewRequester? reviewRequester;
  Future<void> Function(SolutionRecord record)? onSolutionAdded;
  Future<void> Function(String id)? onSolutionRemoved;

  bool _isReady = false;
  bool _hasCompletedOnboarding = false;
  bool _learningMode = true;
  ThemeMode _themeMode = ThemeMode.light;
  bool _analyticsEnabled = false;
  List<SolutionRecord> _solutions = const [];
  List<ReviewItem> _reviewItems = const [];
  Map<String, DateTime> _pendingSolutionDeletions = const {};
  String? _learningOwnerId;
  Future<void>? _ownerSwitch;
  var _ownerRevision = 0;
  var _deletionRevision = 0;
  var _solutionMutationRevision = 0;
  final Set<int> _pendingSolutionUploadRevisions = {};

  bool get isReady => _isReady;
  bool get hasCompletedOnboarding => _hasCompletedOnboarding;
  bool get learningMode => _learningMode;
  ThemeMode get themeMode => _themeMode;
  bool get analyticsEnabled => _analyticsEnabled;
  List<SolutionRecord> get solutions => List.unmodifiable(_solutions);
  List<ReviewItem> get reviewItems => List.unmodifiable(_reviewItems);
  Map<String, DateTime> get pendingSolutionDeletions =>
      Map.unmodifiable(_pendingSolutionDeletions);
  String? get learningOwnerId => _learningOwnerId;
  bool get hasPendingSolutionUploads =>
      _pendingSolutionUploadRevisions.isNotEmpty;
  int get solutionMutationRevision => _solutionMutationRevision;
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
      _repository.readSolutions(ownerId: null),
      _repository.readThemeMode(),
      _repository.readLearningMode(),
      _repository.readReviewItems(ownerId: null),
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
    final ownerId = _learningOwnerId;
    final saveToCloud = onSolutionAdded;
    final uploadRevision = ownerId != null && saveToCloud != null
        ? ++_solutionMutationRevision
        : null;
    if (uploadRevision != null) {
      _pendingSolutionUploadRevisions.add(uploadRevision);
    }
    Future<void>? deletionWrite;
    if (ownerId != null && _pendingSolutionDeletions.containsKey(record.id)) {
      _pendingSolutionDeletions = Map<String, DateTime>.of(
        _pendingSolutionDeletions,
      )..remove(record.id);
      deletionWrite = _persistPendingSolutionDeletions(ownerId);
    }
    _solutions = [
      record,
      ..._solutions.where((item) => item.id != record.id),
    ].take(100).toList(growable: false);
    notifyListeners();
    await Future.wait([
      _repository.writeSolutions(_solutions, ownerId: ownerId),
      ?deletionWrite,
    ]);
    unawaited(MobileAnalytics.learningActivity('solve'));
    if (_learningOwnerId != ownerId) return;
    try {
      await saveToCloud?.call(record);
      if (uploadRevision != null && _learningOwnerId == ownerId) {
        _pendingSolutionUploadRevisions.remove(uploadRevision);
      }
    } on Object {
      // The local notebook is authoritative while cloud sync is unavailable.
    }
  }

  void acknowledgeSolutionUploads({
    required String expectedOwnerId,
    required int throughRevision,
  }) {
    if (_learningOwnerId != expectedOwnerId) return;
    _pendingSolutionUploadRevisions.removeWhere(
      (revision) => revision <= throughRevision,
    );
  }

  Future<void> removeSolution(String id) async {
    final ownerId = _learningOwnerId;
    _solutions = _solutions
        .where((record) => record.id != id)
        .toList(growable: false);
    final remainingSolutions = List<SolutionRecord>.of(_solutions);
    notifyListeners();
    if (ownerId != null) {
      _pendingSolutionDeletions = {
        ..._pendingSolutionDeletions,
        id: DateTime.now(),
      };
      // Persist the outbox first. If the process stops between these writes,
      // startup still filters the older solution record through the tombstone.
      await _persistPendingSolutionDeletions(ownerId);
    }
    await _repository.writeSolutions(remainingSolutions, ownerId: ownerId);
    if (_learningOwnerId != ownerId) return;
    final removeFromCloud = onSolutionRemoved;
    if (removeFromCloud == null) return;
    try {
      await removeFromCloud(id);
      if (ownerId != null && _learningOwnerId == ownerId) {
        await acknowledgeSolutionDeletion(id, expectedOwnerId: ownerId);
      }
    } on Object {
      // The durable owner-scoped outbox retries cloud convergence later.
    }
  }

  Future<void> acknowledgeSolutionDeletion(
    String id, {
    required String expectedOwnerId,
  }) async {
    if (_learningOwnerId != expectedOwnerId ||
        !_pendingSolutionDeletions.containsKey(id)) {
      return;
    }
    _pendingSolutionDeletions = Map<String, DateTime>.of(
      _pendingSolutionDeletions,
    )..remove(id);
    await _persistPendingSolutionDeletions(expectedOwnerId);
  }

  Future<void> _persistPendingSolutionDeletions(String ownerId) async {
    final revision = ++_deletionRevision;
    final snapshot = Map<String, DateTime>.of(_pendingSolutionDeletions);
    await _repository.writePendingSolutionDeletions(snapshot, ownerId: ownerId);
    if (_learningOwnerId == ownerId && revision != _deletionRevision) {
      await _repository.writePendingSolutionDeletions(
        _pendingSolutionDeletions,
        ownerId: ownerId,
      );
    }
  }

  Future<void> mergeCloudSolutions(
    List<SolutionRecord> cloudSolutions,
    Map<String, DateTime> deletions,
  ) async {
    final merged = <String, SolutionRecord>{};
    for (final record in [..._solutions, ...cloudSolutions]) {
      if (_pendingSolutionDeletions.containsKey(record.id)) continue;
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
    await _repository.writeSolutions(_solutions, ownerId: _learningOwnerId);
  }

  Future<void> switchLearningOwner(
    String? ownerId, {
    bool claimGuestData = false,
  }) {
    if (_learningOwnerId == ownerId) {
      return _ownerSwitch ?? Future<void>.value();
    }

    final previousOwner = _learningOwnerId;
    final guestSolutions = previousOwner == null
        ? List<SolutionRecord>.of(_solutions)
        : const <SolutionRecord>[];
    final guestReviews = previousOwner == null
        ? List<ReviewItem>.of(_reviewItems)
        : const <ReviewItem>[];
    final revision = ++_ownerRevision;
    _learningOwnerId = ownerId;
    _solutions = const [];
    _reviewItems = const [];
    _pendingSolutionDeletions = const {};
    _deletionRevision++;
    _solutionMutationRevision++;
    _pendingSolutionUploadRevisions.clear();
    notifyListeners();

    final operation = _loadLearningOwner(
      ownerId,
      previousOwner: previousOwner,
      guestSolutions: guestSolutions,
      guestReviews: guestReviews,
      claimGuestData: claimGuestData,
      revision: revision,
    );
    _ownerSwitch = operation;
    return operation;
  }

  Future<void> _loadLearningOwner(
    String? ownerId, {
    required String? previousOwner,
    required List<SolutionRecord> guestSolutions,
    required List<ReviewItem> guestReviews,
    required bool claimGuestData,
    required int revision,
  }) async {
    final values = await Future.wait<Object>([
      _repository.readSolutions(ownerId: ownerId),
      _repository.readReviewItems(ownerId: ownerId),
      _repository.readPendingSolutionDeletions(ownerId: ownerId),
    ]);
    if (_learningOwnerId != ownerId || _ownerRevision != revision) return;

    final storedSolutions = values[0] as List<SolutionRecord>;
    final storedReviews = values[1] as List<ReviewItem>;
    final storedDeletions = values[2] as Map<String, DateTime>;
    final visibleStoredSolutions = storedSolutions
        .where((record) => !storedDeletions.containsKey(record.id))
        .toList(growable: false);
    final shouldClaimGuest =
        claimGuestData && previousOwner == null && ownerId != null;
    final nextSolutions =
        shouldClaimGuest
              ? _mergeSolutions(guestSolutions, visibleStoredSolutions)
              : List<SolutionRecord>.of(visibleStoredSolutions)
          ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
    final nextReviews = shouldClaimGuest
        ? _mergeReviews(guestReviews, storedReviews)
        : List<ReviewItem>.of(storedReviews);

    _solutions = nextSolutions.take(100).toList(growable: false);
    _reviewItems = nextReviews.take(100).toList(growable: false);
    _pendingSolutionDeletions = Map<String, DateTime>.of(storedDeletions);
    _deletionRevision++;
    notifyListeners();

    if (shouldClaimGuest) {
      await Future.wait([
        _repository.writeSolutions(_solutions, ownerId: ownerId),
        _repository.writeReviewItems(_reviewItems, ownerId: ownerId),
      ]);
      await Future.wait([
        _repository.writeSolutions(const [], ownerId: null),
        _repository.writeReviewItems(const [], ownerId: null),
      ]);
    }
  }

  static List<SolutionRecord> _mergeSolutions(
    List<SolutionRecord> first,
    List<SolutionRecord> second,
  ) {
    final merged = <String, SolutionRecord>{};
    for (final record in [...first, ...second]) {
      final existing = merged[record.id];
      if (existing == null || record.createdAt.isAfter(existing.createdAt)) {
        merged[record.id] = record;
      }
    }
    return merged.values.toList()
      ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
  }

  static List<ReviewItem> _mergeReviews(
    List<ReviewItem> first,
    List<ReviewItem> second,
  ) {
    final merged = <String, ReviewItem>{};
    for (final item in [...first, ...second]) {
      merged[item.id] = item;
    }
    return merged.values.toList()
      ..sort((left, right) => left.dueAt.compareTo(right.dueAt));
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
    await _repository.writeReviewItems(_reviewItems, ownerId: _learningOwnerId);
  }

  Future<void> maybeRequestReviewAfterPractice({
    required int score,
    required int questionCount,
  }) async {
    await reviewRequester?.requestAfterPractice(
      savedSolutionCount: _solutions.length,
      score: score,
      questionCount: questionCount,
    );
  }

  Future<void> maybeRequestReviewAfterVerifiedSolve() async {
    await reviewRequester?.requestAfterVerifiedSolve(
      savedSolutionCount: _solutions.length,
    );
  }

  Future<void> removeReviewItem(String id) async {
    _reviewItems = _reviewItems
        .where((item) => item.id != id)
        .toList(growable: false);
    notifyListeners();
    await _repository.writeReviewItems(_reviewItems, ownerId: _learningOwnerId);
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

  Future<void> clearPersonalData() async {
    _ownerRevision++;
    _ownerSwitch = null;
    _solutions = const [];
    _reviewItems = const [];
    _pendingSolutionDeletions = const {};
    _deletionRevision++;
    _solutionMutationRevision++;
    _pendingSolutionUploadRevisions.clear();
    _analyticsEnabled = false;
    notifyListeners();
    await MobileAnalytics.setEnabled(false);
    await _repository.clearLearningData();
  }

  Future<void> clearOwnerPersonalData(String ownerId) async {
    if (ownerId.isEmpty) return;
    if (_learningOwnerId == ownerId) {
      _ownerRevision++;
      _ownerSwitch = null;
      _solutions = const [];
      _reviewItems = const [];
      _pendingSolutionDeletions = const {};
      _deletionRevision++;
      _solutionMutationRevision++;
      _pendingSolutionUploadRevisions.clear();
      notifyListeners();
    }
    await _repository.clearOwnerLearningData(ownerId);
  }
}

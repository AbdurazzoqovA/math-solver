import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/cloud_notebook_api.dart';
import 'package:mathsolver_mobile/core/network/notebook_sync_coordinator.dart';
import 'package:mathsolver_mobile/core/storage/notebook_repository.dart';
import 'package:mathsolver_mobile/features/app/app_controller.dart';
import 'package:mathsolver_mobile/features/practice/domain/review_item.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_record.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test(
    'guest work is claimed once and never uploaded to a second account',
    () async {
      final guest = _solution('guest');
      final accountA = _solution('account-a');
      final accountB = _solution('account-b');
      final repository = _ScopedMemoryRepository(guestSolutions: [guest]);
      final controller = AppController(repository);
      final account = _MutableAccountController('a');
      final cloud = _FakeCloudNotebookStore()
        ..snapshots['a'] = _snapshot([accountA])
        ..snapshots['b'] = _snapshot([accountB]);
      final coordinator = NotebookSyncCoordinator(controller, account, cloud);
      addTearDown(() {
        coordinator.dispose();
        account.dispose();
        controller.dispose();
      });

      await controller.initialize();
      coordinator.schedule();
      await coordinator.settle();
      expect(controller.learningOwnerId, 'a');
      expect(controller.solutions.map((item) => item.id), {
        'guest',
        'account-a',
      });

      account.userIdValue = null;
      coordinator.schedule();
      await coordinator.settle();
      expect(controller.solutions, isEmpty);

      account.userIdValue = 'b';
      coordinator.schedule();
      await coordinator.settle();
      expect(controller.learningOwnerId, 'b');
      expect(controller.solutions.map((item) => item.id), ['account-b']);
      expect(cloud.savedIds['b'], ['account-b']);
      expect(cloud.savedIds['b'], isNot(contains('guest')));
      expect(cloud.savedIds['b'], isNot(contains('account-a')));
    },
  );

  test(
    'an account change discards an older in-flight cloud response',
    () async {
      final accountA = _solution('private-a');
      final accountB = _solution('private-b');
      final repository = _ScopedMemoryRepository();
      final controller = AppController(repository);
      final account = _MutableAccountController('a');
      final delayedA = Completer<CloudNotebookSnapshot>();
      final cloud = _FakeCloudNotebookStore()
        ..pendingLoads['a'] = delayedA
        ..snapshots['b'] = _snapshot([accountB]);
      final coordinator = NotebookSyncCoordinator(controller, account, cloud);
      addTearDown(() {
        coordinator.dispose();
        account.dispose();
        controller.dispose();
      });

      await controller.initialize();
      coordinator.schedule();
      await cloud.waitUntilLoadStarted('a');

      account.userIdValue = 'b';
      coordinator.schedule();
      expect(controller.learningOwnerId, 'b');
      expect(
        controller.solutions,
        isEmpty,
        reason: 'Account A data must disappear before its request finishes.',
      );
      delayedA.complete(_snapshot([accountA]));
      await coordinator.settle();

      expect(controller.learningOwnerId, 'b');
      expect(controller.solutions.map((item) => item.id), ['private-b']);
      expect(cloud.savedIds['b'], ['private-b']);
      expect(cloud.savedIds['b'], isNot(contains('private-a')));
    },
  );

  test('a rapid switch back still refreshes the original account', () async {
    final firstA = _solution('first-a');
    final secondA = _solution('second-a');
    final repository = _ScopedMemoryRepository();
    final controller = AppController(repository);
    final account = _MutableAccountController('a');
    final delayedB = Completer<CloudNotebookSnapshot>();
    final cloud = _FakeCloudNotebookStore()
      ..snapshots['a'] = _snapshot([firstA])
      ..pendingLoads['b'] = delayedB;
    final coordinator = NotebookSyncCoordinator(controller, account, cloud);
    addTearDown(() {
      coordinator.dispose();
      account.dispose();
      controller.dispose();
    });

    await controller.initialize();
    coordinator.schedule();
    await coordinator.settle();
    expect(controller.solutions.map((item) => item.id), contains('first-a'));

    account.userIdValue = 'b';
    coordinator.schedule();
    await cloud.waitUntilLoadStarted('b');
    cloud.snapshots['a'] = _snapshot([firstA, secondA]);
    account.userIdValue = 'a';
    coordinator.schedule();
    await coordinator.settle();

    expect(controller.solutions.map((item) => item.id), contains('second-a'));
    delayedB.complete(_snapshot(const []));
    await Future<void>.delayed(Duration.zero);
  });

  test('a forced resume refresh retries an unsynced local solution', () async {
    final repository = _ScopedMemoryRepository();
    final controller = AppController(repository);
    final account = _MutableAccountController('a');
    final cloud = _FakeCloudNotebookStore();
    final coordinator = NotebookSyncCoordinator(controller, account, cloud);
    addTearDown(() {
      coordinator.dispose();
      account.dispose();
      controller.dispose();
    });

    await controller.initialize();
    coordinator.schedule();
    await coordinator.settle();
    controller.onSolutionAdded = (_) async => throw StateError('offline');
    await controller.addSolution(_solution('offline-addition'));

    coordinator.schedule();
    await coordinator.settle();
    expect(cloud.savedIds['a'] ?? const <String>[], isEmpty);

    coordinator.schedule(retryPendingWrites: true);
    await coordinator.settle();
    expect(cloud.savedIds['a'], contains('offline-addition'));
  });

  test('resume retry is a no-op when no local upload is pending', () async {
    final repository = _ScopedMemoryRepository();
    final controller = AppController(repository);
    final account = _MutableAccountController('a');
    final cloud = _FakeCloudNotebookStore();
    final coordinator = NotebookSyncCoordinator(controller, account, cloud);
    addTearDown(() {
      coordinator.dispose();
      account.dispose();
      controller.dispose();
    });

    await controller.initialize();
    coordinator.schedule();
    await coordinator.settle();
    expect(cloud.loadCalls['a'], 1);

    coordinator.schedule(retryPendingWrites: true);
    await coordinator.settle();
    expect(cloud.loadCalls['a'], 1);
  });

  test('a delete wins when an older coordinator save finishes last', () async {
    final record = _solution('delete-during-save');
    final repository = _ScopedMemoryRepository()..solutions['a'] = [record];
    final controller = AppController(repository);
    final account = _MutableAccountController('a');
    final delayedSave = Completer<void>();
    final cloud = _FakeCloudNotebookStore()
      ..snapshots['a'] = _snapshot([record])
      ..pendingSaves['a/${record.id}'] = delayedSave;
    final coordinator = NotebookSyncCoordinator(controller, account, cloud);
    addTearDown(() {
      coordinator.dispose();
      account.dispose();
      controller.dispose();
    });

    await controller.initialize();
    await controller.switchLearningOwner('a');
    controller.onSolutionRemoved = (id) =>
        cloud.deleteSolution(id, expectedUserId: 'a');

    coordinator.schedule();
    await cloud.waitUntilSaveStarted('a', record.id);
    await controller.removeSolution(record.id);
    expect(cloud.snapshots['a']!.solutions, isEmpty);

    delayedSave.complete();
    await coordinator.settle();

    expect(controller.solutions, isEmpty);
    expect(controller.pendingSolutionDeletions, isEmpty);
    expect(cloud.snapshots['a']!.solutions, isEmpty);
    expect(cloud.snapshots['a']!.deletions, contains(record.id));
    expect(cloud.deletedIds['a'], [record.id, record.id]);
  });

  test('an owner change suppresses a delayed cloud callback', () async {
    final repository = _ScopedMemoryRepository();
    final controller = AppController(repository);
    addTearDown(controller.dispose);
    await controller.initialize();
    await controller.switchLearningOwner('a');

    final writeStarted = Completer<void>();
    final releaseWrite = Completer<void>();
    repository.onWriteSolutions = (ownerId) async {
      if (ownerId != 'a') return;
      writeStarted.complete();
      await releaseWrite.future;
    };
    var callbackCount = 0;
    controller.onSolutionAdded = (_) async => callbackCount++;

    final add = controller.addSolution(_solution('private-a'));
    await writeStarted.future;
    final switchOwner = controller.switchLearningOwner('b');
    releaseWrite.complete();
    await Future.wait([add, switchOwner]);

    expect(controller.learningOwnerId, 'b');
    expect(callbackCount, 0);
    expect(repository.solutions['a']?.map((item) => item.id), ['private-a']);
  });

  test(
    'a delayed delete never writes the next owner into the old scope',
    () async {
      final recordA = _solution('private-a');
      final recordB = _solution('private-b');
      final repository = _ScopedMemoryRepository()
        ..solutions['a'] = [recordA]
        ..solutions['b'] = [recordB];
      final controller = AppController(repository);
      addTearDown(controller.dispose);
      await controller.initialize();
      await controller.switchLearningOwner('a');

      final deletionWriteStarted = Completer<void>();
      final finishDeletionWrite = Completer<void>();
      repository.onWritePendingDeletions = (ownerId) async {
        if (ownerId != 'a') return;
        if (!deletionWriteStarted.isCompleted) deletionWriteStarted.complete();
        await finishDeletionWrite.future;
      };

      final removal = controller.removeSolution(recordA.id);
      await deletionWriteStarted.future;
      final switchOwner = controller.switchLearningOwner('b');
      finishDeletionWrite.complete();
      await Future.wait([removal, switchOwner]);

      expect(repository.solutions['a'], isEmpty);
      expect(repository.solutions['b']?.map((item) => item.id), ['private-b']);
    },
  );

  test('clearing personal data invalidates an in-flight owner load', () async {
    final repository = _ScopedMemoryRepository();
    final controller = AppController(repository);
    addTearDown(controller.dispose);
    await controller.initialize();

    final delayedRead = Completer<List<SolutionRecord>>();
    repository.pendingSolutionReads['a'] = delayedRead;
    final ownerLoad = controller.switchLearningOwner('a');
    await controller.clearPersonalData();
    delayedRead.complete([_solution('must-stay-cleared')]);
    await ownerLoad;

    expect(controller.solutions, isEmpty);
  });

  test('clearing one owner never changes another active owner', () async {
    final accountA = _solution('private-a');
    final accountB = _solution('private-b');
    final repository = _ScopedMemoryRepository()
      ..solutions['a'] = [accountA]
      ..solutions['b'] = [accountB];
    final controller = AppController(repository);
    addTearDown(controller.dispose);
    await controller.initialize();
    await controller.switchLearningOwner('b');

    await controller.clearOwnerPersonalData('a');

    expect(controller.learningOwnerId, 'b');
    expect(controller.solutions.map((item) => item.id), ['private-b']);
    expect(repository.solutions['a'], isNull);
    expect(repository.solutions['b']?.map((item) => item.id), ['private-b']);
  });

  test(
    'an offline deletion survives restart and is retried without resurrection',
    () async {
      final deleted = _solution('delete-me');
      final repository = _ScopedMemoryRepository()..solutions['a'] = [deleted];
      final account = _MutableAccountController('a');
      final cloud = _FakeCloudNotebookStore()
        ..snapshots['a'] = _snapshot([deleted])
        ..failDeletesFor.add('a');
      addTearDown(account.dispose);

      final firstController = AppController(repository);
      final firstCoordinator = NotebookSyncCoordinator(
        firstController,
        account,
        cloud,
      );
      await firstController.initialize();
      await firstController.switchLearningOwner('a');
      firstController.onSolutionRemoved = (id) =>
          cloud.deleteSolution(id, expectedUserId: 'a');

      await firstController.removeSolution(deleted.id);
      firstCoordinator.schedule();
      await firstCoordinator.settle();
      expect(firstController.solutions, isEmpty);
      expect(
        firstController.pendingSolutionDeletions.keys,
        contains(deleted.id),
      );
      firstCoordinator.dispose();
      firstController.dispose();

      cloud.failDeletesFor.remove('a');
      final restoredController = AppController(repository);
      final restoredCoordinator = NotebookSyncCoordinator(
        restoredController,
        account,
        cloud,
      );
      addTearDown(() {
        restoredCoordinator.dispose();
        restoredController.dispose();
      });
      await restoredController.initialize();
      restoredCoordinator.schedule();
      await restoredCoordinator.settle();

      expect(restoredController.solutions, isEmpty);
      expect(restoredController.pendingSolutionDeletions, isEmpty);
      expect(cloud.deletedIds['a'], contains(deleted.id));
      expect(cloud.snapshots['a']!.solutions, isEmpty);
    },
  );

  test('a deletion tombstone never hides another account record', () async {
    final sameIdA = _solution('same-id');
    final sameIdB = SolutionRecord(
      id: sameIdA.id,
      problem: 'account-b-problem',
      solution: 'account-b-solution',
      createdAt: sameIdA.createdAt,
      source: ProblemSource.typed,
    );
    final repository = _ScopedMemoryRepository()
      ..solutions['a'] = [sameIdA]
      ..solutions['b'] = [sameIdB]
      ..pendingDeletions['a'] = {
        sameIdA.id: sameIdA.createdAt.subtract(const Duration(days: 1)),
      };
    final controller = AppController(repository);
    addTearDown(controller.dispose);

    await controller.initialize();
    await controller.switchLearningOwner('a');
    expect(controller.solutions, isEmpty);
    await controller.switchLearningOwner('b');
    expect(controller.solutions.single.problem, 'account-b-problem');
  });

  test(
    'legacy v1 data stays local and is never uploaded to a restored account',
    () async {
      final legacy = _solution('ambiguous-legacy');
      SharedPreferences.setMockInitialValues({
        'mathsolver.notebook.v1': jsonEncode([legacy.toJson()]),
      });
      final repository = SharedPreferencesNotebookRepository();
      final controller = AppController(repository);
      final account = _MutableAccountController('a');
      final cloud = _FakeCloudNotebookStore();
      final coordinator = NotebookSyncCoordinator(controller, account, cloud);
      addTearDown(() {
        coordinator.dispose();
        account.dispose();
        controller.dispose();
      });

      await controller.initialize();
      coordinator.schedule();
      await coordinator.settle();

      expect(controller.solutions, isEmpty);
      expect(cloud.savedIds['a'] ?? const <String>[], isEmpty);
      final preferences = await SharedPreferences.getInstance();
      expect(preferences.getString('mathsolver.notebook.v1'), isNotNull);
    },
  );

  test(
    'shared preferences separates scopes and clear removes every generation',
    () async {
      SharedPreferences.setMockInitialValues({
        'mathsolver.notebook.v1': jsonEncode([
          _solution('ambiguous-legacy').toJson(),
        ]),
        'mathsolver.review-items.v1': '[]',
      });
      final repository = SharedPreferencesNotebookRepository();
      await repository.writeSolutions([_solution('guest')]);
      await repository.writeSolutions([_solution('a')], ownerId: 'user-a');
      await repository.writeSolutions([_solution('b')], ownerId: 'user-b');
      final deletedAt = DateTime.utc(2026, 8, 25, 12);
      await repository.writePendingSolutionDeletions({
        'deleted-a': deletedAt,
      }, ownerId: 'user-a');
      await repository.writePendingSolutionDeletions({
        'deleted-b': deletedAt,
      }, ownerId: 'user-b');

      expect((await repository.readSolutions()).map((item) => item.id), [
        'guest',
      ]);
      expect(
        (await repository.readSolutions(
          ownerId: 'user-a',
        )).map((item) => item.id),
        ['a'],
      );
      expect(
        (await repository.readSolutions(
          ownerId: 'user-b',
        )).map((item) => item.id),
        ['b'],
      );
      expect(
        (await repository.readPendingSolutionDeletions(ownerId: 'user-a')).keys,
        ['deleted-a'],
      );
      expect(
        (await repository.readPendingSolutionDeletions(ownerId: 'user-b')).keys,
        ['deleted-b'],
      );

      await repository.clearLearningData();
      final preferences = await SharedPreferences.getInstance();
      expect(
        preferences.getKeys().where(
          (key) =>
              key.startsWith('mathsolver.notebook') ||
              key.startsWith('mathsolver.review-items'),
        ),
        isEmpty,
      );
    },
  );

  test(
    'shared preferences owner cleanup preserves guest and other users',
    () async {
      SharedPreferences.setMockInitialValues({});
      final repository = SharedPreferencesNotebookRepository();
      await repository.writeSolutions([_solution('guest')]);
      await repository.writeSolutions([_solution('a')], ownerId: 'user-a');
      await repository.writeSolutions([_solution('b')], ownerId: 'user-b');
      final deletedAt = DateTime.utc(2026, 8, 25, 12);
      await repository.writePendingSolutionDeletions({
        'deleted-a': deletedAt,
      }, ownerId: 'user-a');
      await repository.writePendingSolutionDeletions({
        'deleted-b': deletedAt,
      }, ownerId: 'user-b');

      await repository.clearOwnerLearningData('user-a');

      expect((await repository.readSolutions()).map((item) => item.id), [
        'guest',
      ]);
      expect(await repository.readSolutions(ownerId: 'user-a'), isEmpty);
      expect(
        (await repository.readSolutions(
          ownerId: 'user-b',
        )).map((item) => item.id),
        ['b'],
      );
      expect(
        await repository.readPendingSolutionDeletions(ownerId: 'user-a'),
        isEmpty,
      );
      expect(
        (await repository.readPendingSolutionDeletions(ownerId: 'user-b')).keys,
        ['deleted-b'],
      );
    },
  );
}

CloudNotebookSnapshot _snapshot(List<SolutionRecord> solutions) =>
    CloudNotebookSnapshot(solutions: solutions, deletions: const {});

SolutionRecord _solution(String id) => SolutionRecord(
  id: id,
  problem: 'problem-$id',
  solution: 'solution-$id',
  createdAt: DateTime.utc(2026, 8, 25),
  source: ProblemSource.typed,
);

class _MutableAccountController extends AccountController {
  _MutableAccountController(this.userIdValue);

  String? userIdValue;

  @override
  bool get isSignedIn => userIdValue != null;

  @override
  String? get userId => userIdValue;
}

class _FakeCloudNotebookStore implements CloudNotebookStore {
  final snapshots = <String, CloudNotebookSnapshot>{};
  final pendingLoads = <String, Completer<CloudNotebookSnapshot>>{};
  final pendingSaves = <String, Completer<void>>{};
  final savedIds = <String, List<String>>{};
  final deletedIds = <String, List<String>>{};
  final failDeletesFor = <String>{};
  final loadCalls = <String, int>{};
  final _loadStarted = <String, Completer<void>>{};
  final _saveStarted = <String, Completer<void>>{};

  Future<void> waitUntilLoadStarted(String userId) {
    return (_loadStarted[userId] ??= Completer<void>()).future;
  }

  Future<void> waitUntilSaveStarted(String userId, String solutionId) {
    return (_saveStarted['$userId/$solutionId'] ??= Completer<void>()).future;
  }

  @override
  Future<CloudNotebookSnapshot> loadNotebook({String? expectedUserId}) async {
    final userId = expectedUserId!;
    loadCalls.update(userId, (value) => value + 1, ifAbsent: () => 1);
    final started = _loadStarted[userId] ??= Completer<void>();
    if (!started.isCompleted) started.complete();
    final pending = pendingLoads[userId];
    if (pending != null) return pending.future;
    return snapshots[userId] ?? _snapshot(const []);
  }

  @override
  Future<void> saveSolution(
    SolutionRecord record, {
    String? expectedUserId,
  }) async {
    final userId = expectedUserId!;
    final key = '$userId/${record.id}';
    final started = _saveStarted[key] ??= Completer<void>();
    if (!started.isCompleted) started.complete();
    await pendingSaves[key]?.future;
    savedIds.putIfAbsent(userId, () => []).add(record.id);
    final current = snapshots[userId] ?? _snapshot(const []);
    snapshots[userId] = CloudNotebookSnapshot(
      solutions: [
        record,
        ...current.solutions.where((solution) => solution.id != record.id),
      ],
      deletions: Map<String, DateTime>.of(current.deletions)..remove(record.id),
    );
  }

  @override
  Future<void> deleteSolution(String id, {String? expectedUserId}) async {
    final userId = expectedUserId!;
    if (failDeletesFor.contains(userId)) {
      throw StateError('offline');
    }
    deletedIds.putIfAbsent(userId, () => []).add(id);
    final current = snapshots[userId] ?? _snapshot(const []);
    snapshots[userId] = CloudNotebookSnapshot(
      solutions: current.solutions
          .where((solution) => solution.id != id)
          .toList(growable: false),
      deletions: {...current.deletions, id: DateTime.utc(2026, 8, 25, 13)},
    );
  }
}

class _ScopedMemoryRepository implements NotebookRepository {
  _ScopedMemoryRepository({List<SolutionRecord> guestSolutions = const []}) {
    solutions[null] = List.of(guestSolutions);
  }

  final Map<String?, List<SolutionRecord>> solutions = {};
  final Map<String?, List<ReviewItem>> reviews = {};
  final Map<String?, Map<String, DateTime>> pendingDeletions = {};
  final Map<String?, Completer<List<SolutionRecord>>> pendingSolutionReads = {};
  Future<void> Function(String? ownerId)? onWriteSolutions;
  Future<void> Function(String? ownerId)? onWritePendingDeletions;

  @override
  Future<List<SolutionRecord>> readSolutions({String? ownerId}) async {
    final pending = pendingSolutionReads[ownerId];
    if (pending != null) return pending.future;
    return List.of(solutions[ownerId] ?? const []);
  }

  @override
  Future<void> writeSolutions(
    List<SolutionRecord> value, {
    String? ownerId,
  }) async {
    solutions[ownerId] = List.of(value);
    await onWriteSolutions?.call(ownerId);
  }

  @override
  Future<List<ReviewItem>> readReviewItems({String? ownerId}) async =>
      List.of(reviews[ownerId] ?? const []);

  @override
  Future<Map<String, DateTime>> readPendingSolutionDeletions({
    String? ownerId,
  }) async => Map.of(pendingDeletions[ownerId] ?? const {});

  @override
  Future<void> writeReviewItems(
    List<ReviewItem> items, {
    String? ownerId,
  }) async {
    reviews[ownerId] = List.of(items);
  }

  @override
  Future<void> writePendingSolutionDeletions(
    Map<String, DateTime> deletions, {
    String? ownerId,
  }) async {
    pendingDeletions[ownerId] = Map.of(deletions);
    await onWritePendingDeletions?.call(ownerId);
  }

  @override
  Future<void> clearOwnerLearningData(String ownerId) async {
    solutions.remove(ownerId);
    reviews.remove(ownerId);
    pendingDeletions.remove(ownerId);
  }

  @override
  Future<void> clearLearningData() async {
    solutions.clear();
    reviews.clear();
    pendingDeletions.clear();
  }

  @override
  Future<bool> readAnalyticsEnabled() async => false;

  @override
  Future<bool> readLearningMode() async => true;

  @override
  Future<bool> readOnboardingComplete() async => true;

  @override
  Future<ThemeMode> readThemeMode() async => ThemeMode.light;

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {}

  @override
  Future<void> writeLearningMode(bool value) async {}

  @override
  Future<void> writeOnboardingComplete(bool value) async {}

  @override
  Future<void> writeThemeMode(ThemeMode mode) async {}
}

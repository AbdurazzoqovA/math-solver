import '../../features/app/app_controller.dart';
import '../../features/solve/domain/solution_record.dart';
import '../auth/account_controller.dart';
import 'cloud_notebook_api.dart';

class NotebookSyncCoordinator {
  NotebookSyncCoordinator(this._controller, this._account, this._cloudNotebook);

  final AppController _controller;
  final AccountController _account;
  final CloudNotebookStore _cloudNotebook;

  Future<void> _pending = Future<void>.value();
  String? _syncedUserId;
  var _revision = 0;
  var _disposed = false;

  void schedule({bool retryPendingWrites = false}) {
    if (_disposed) return;
    if (retryPendingWrites && _controller.hasPendingSolutionUploads) {
      _syncedUserId = null;
    }
    final revision = ++_revision;
    final userId = _account.isSignedIn ? _account.userId : null;
    if (_controller.learningOwnerId != userId) _syncedUserId = null;
    _pending = _reconcile(userId, revision).catchError((Object _) {});
  }

  Future<void> settle() => _pending;

  void dispose() {
    _disposed = true;
    _revision++;
  }

  bool _isCurrent(String? userId, int revision) {
    if (_disposed || revision != _revision) return false;
    final currentUserId = _account.isSignedIn ? _account.userId : null;
    return currentUserId == userId;
  }

  Future<void> _reconcile(String? userId, int revision) async {
    if (!_controller.isReady || !_isCurrent(userId, revision)) return;

    if (userId == null) {
      await _controller.switchLearningOwner(null);
      if (_isCurrent(userId, revision)) _syncedUserId = null;
      return;
    }

    await _controller.switchLearningOwner(userId, claimGuestData: true);
    if (!_isCurrent(userId, revision) ||
        (_syncedUserId == userId &&
            _controller.pendingSolutionDeletions.isEmpty)) {
      return;
    }

    try {
      final cloud = await _cloudNotebook.loadNotebook(expectedUserId: userId);
      if (!_isCurrent(userId, revision)) return;

      await _controller.mergeCloudSolutions(cloud.solutions, cloud.deletions);
      if (!_isCurrent(userId, revision)) return;

      final pendingDeletions = _controller.pendingSolutionDeletions;
      for (final id in pendingDeletions.keys) {
        if (!_isCurrent(userId, revision)) return;
        await _cloudNotebook.deleteSolution(id, expectedUserId: userId);
        if (!_isCurrent(userId, revision)) return;
        await _controller.acknowledgeSolutionDeletion(
          id,
          expectedOwnerId: userId,
        );
      }
      if (!_isCurrent(userId, revision)) return;

      final solutionRevision = _controller.solutionMutationRevision;
      final solutions = _controller.solutions;
      for (final solution in solutions) {
        if (!await _convergeSolution(solution.id, userId, revision)) return;
      }
      if (_isCurrent(userId, revision)) {
        _controller.acknowledgeSolutionUploads(
          expectedOwnerId: userId,
          throughRevision: solutionRevision,
        );
        _syncedUserId = userId;
      }
    } on Object {
      // Local work remains available. A later account or app event retries.
    }
  }

  Future<bool> _convergeSolution(
    String solutionId,
    String userId,
    int revision,
  ) async {
    while (_isCurrent(userId, revision)) {
      final local = _currentSolution(solutionId);
      if (local == null) {
        await _cloudNotebook.deleteSolution(solutionId, expectedUserId: userId);
        if (!_isCurrent(userId, revision)) return false;
        if (_currentSolution(solutionId) != null) continue;
        await _controller.acknowledgeSolutionDeletion(
          solutionId,
          expectedOwnerId: userId,
        );
        return _isCurrent(userId, revision);
      }

      await _cloudNotebook.saveSolution(local, expectedUserId: userId);
      if (!_isCurrent(userId, revision)) return false;
      final latest = _currentSolution(solutionId);
      if (latest != null && _sameSolution(latest, local)) return true;
    }
    return false;
  }

  SolutionRecord? _currentSolution(String id) {
    for (final solution in _controller.solutions) {
      if (solution.id == id) return solution;
    }
    return null;
  }

  static bool _sameSolution(SolutionRecord left, SolutionRecord right) =>
      left.id == right.id &&
      left.problem == right.problem &&
      left.solution == right.solution &&
      left.createdAt == right.createdAt &&
      left.source == right.source;
}

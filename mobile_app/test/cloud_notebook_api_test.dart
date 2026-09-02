import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mathsolver_mobile/core/auth/account_controller.dart';
import 'package:mathsolver_mobile/core/network/cloud_notebook_api.dart';
import 'package:mathsolver_mobile/features/solve/domain/solution_record.dart';

void main() {
  test(
    'expected account mismatch fails instead of acknowledging a no-op',
    () async {
      final account = _NotebookAccount('account-b');
      var requests = 0;
      final api = CloudNotebookApi(
        account: account,
        client: MockClient((_) async {
          requests += 1;
          return http.Response('{}', 200);
        }),
      );
      addTearDown(() {
        api.close();
        account.dispose();
      });

      await expectLater(
        api.deleteSolution('private-record', expectedUserId: 'account-a'),
        throwsA(isA<AccountException>()),
      );
      expect(requests, 0);
    },
  );

  test('saving fails when an old cloud tombstone cannot be cleared', () async {
    final account = _NotebookAccount('account-a');
    final methods = <String>[];
    final api = CloudNotebookApi(
      account: account,
      client: MockClient((request) async {
        methods.add(request.method);
        if (request.method == 'PATCH') return http.Response('{}', 200);
        return http.Response('{}', 503);
      }),
    );
    addTearDown(() {
      api.close();
      account.dispose();
    });

    await expectLater(
      api.saveSolution(
        SolutionRecord(
          id: 'solution-id',
          problem: '2 + 2',
          solution: '4',
          createdAt: DateTime.utc(2026, 8, 25),
          source: ProblemSource.typed,
        ),
        expectedUserId: 'account-a',
      ),
      throwsA(isA<CloudNotebookException>()),
    );
    expect(methods, ['PATCH', 'DELETE']);
  });
}

class _NotebookAccount extends AccountController {
  _NotebookAccount(this.currentUserId);

  String? currentUserId;

  @override
  bool get isSignedIn => currentUserId != null;

  @override
  String? get userId => currentUserId;

  @override
  Future<String> getIdToken({String? expectedUserId}) async {
    if (currentUserId == null ||
        (expectedUserId != null && currentUserId != expectedUserId)) {
      throw const AccountException('Account changed.');
    }
    return 'id-token';
  }
}

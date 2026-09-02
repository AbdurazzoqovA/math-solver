import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mathsolver_mobile/core/network/mathsolver_api.dart';

void main() {
  test(
    'streamSolution fails when the response body stops making progress',
    () async {
      final body = StreamController<List<int>>();
      addTearDown(body.close);
      final client = _StreamingClient(body.stream);
      final api = MathSolverApi(
        client: client,
        baseUrl: 'https://example.test',
        solveStreamInactivityTimeout: const Duration(milliseconds: 30),
      );
      addTearDown(api.close);

      scheduleMicrotask(() => body.add(utf8.encode('**Step 1:** partial')));

      await expectLater(
        api.streamSolution(
          messages: const [
            {'role': 'user', 'content': 'x + 1 = 2'},
          ],
        ),
        emitsInOrder([
          '**Step 1:** partial',
          emitsError(isA<TimeoutException>()),
        ]),
      );
    },
  );
}

class _StreamingClient extends http.BaseClient {
  _StreamingClient(this.body);

  final Stream<List<int>> body;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async =>
      http.StreamedResponse(body, 200, request: request);
}

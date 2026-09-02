import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/solve/presentation/temporary_image_file.dart';

void main() {
  test('temporary image is deleted after its bytes are read', () async {
    final directory = await Directory.systemTemp.createTemp(
      'mathsolver-image-test-',
    );
    addTearDown(() async {
      if (await directory.exists()) {
        await directory.delete(recursive: true);
      }
    });
    final file = File('${directory.path}/capture.jpg');
    await file.writeAsBytes([1, 2, 3, 4]);

    final bytes = await readAndDeleteTemporaryImage(file.path);

    expect(bytes, [1, 2, 3, 4]);
    expect(await file.exists(), isFalse);
  });

  test('deleting an already-missing temporary image is harmless', () async {
    final path = '${Directory.systemTemp.path}/missing-mathsolver-image.jpg';

    await expectLater(deleteTemporaryImage(path), completes);
  });
}

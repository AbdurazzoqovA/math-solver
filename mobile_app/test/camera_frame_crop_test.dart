import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:mathsolver_mobile/features/solve/presentation/camera_frame_crop.dart';

void main() {
  test('maps the visible frame into the centered preview', () {
    const preview = Rect.fromLTWH(0, 200, 1000, 1500);
    const frame = Rect.fromLTWH(100, 500, 800, 600);

    final normalized = normalizedCameraFrame(preview: preview, frame: frame);

    expect(normalized.left, closeTo(0.1, 0.0001));
    expect(normalized.top, closeTo(0.2, 0.0001));
    expect(normalized.width, closeTo(0.8, 0.0001));
    expect(normalized.height, closeTo(0.4, 0.0001));
  });

  test('crops camera bytes to the selected viewfinder region', () {
    final source = image.Image(width: 1000, height: 2000);
    final bytes = Uint8List.fromList(image.encodeJpg(source));

    final croppedBytes = cropCameraFrameBytes(
      bytes,
      left: 0.1,
      top: 0.2,
      width: 0.8,
      height: 0.4,
    );
    final cropped = image.decodeImage(croppedBytes);

    expect(cropped, isNotNull);
    expect(cropped!.width, 800);
    expect(cropped.height, 800);
  });
}

import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:image/image.dart' as image;

/// Converts the on-screen frame into coordinates relative to the actual camera
/// preview. This accounts for the black space above and below a centered
/// portrait preview.
Rect normalizedCameraFrame({required Rect preview, required Rect frame}) {
  if (preview.width <= 0 || preview.height <= 0) {
    return const Rect.fromLTWH(0, 0, 1, 1);
  }
  final left = ((frame.left - preview.left) / preview.width).clamp(0.0, 1.0);
  final top = ((frame.top - preview.top) / preview.height).clamp(0.0, 1.0);
  final right = ((frame.right - preview.left) / preview.width).clamp(0.0, 1.0);
  final bottom = ((frame.bottom - preview.top) / preview.height).clamp(
    0.0,
    1.0,
  );
  if (right <= left || bottom <= top) {
    return const Rect.fromLTWH(0, 0, 1, 1);
  }
  return Rect.fromLTRB(left, top, right, bottom);
}

/// Bakes the camera's EXIF orientation, then crops the same normalized region
/// the learner saw in the viewfinder.
Uint8List cropCameraFrameBytes(
  Uint8List bytes, {
  required double left,
  required double top,
  required double width,
  required double height,
}) {
  final decoded = image.decodeImage(bytes);
  if (decoded == null) return bytes;
  final oriented = image.bakeOrientation(decoded);
  final safeLeft = left.clamp(0.0, 1.0);
  final safeTop = top.clamp(0.0, 1.0);
  final safeRight = (left + width).clamp(safeLeft, 1.0);
  final safeBottom = (top + height).clamp(safeTop, 1.0);
  final x = (safeLeft * oriented.width).round().clamp(0, oriented.width - 1);
  final y = (safeTop * oriented.height).round().clamp(0, oriented.height - 1);
  final right = (safeRight * oriented.width).round().clamp(
    x + 1,
    oriented.width,
  );
  final bottom = (safeBottom * oriented.height).round().clamp(
    y + 1,
    oriented.height,
  );
  final cropped = image.copyCrop(
    oriented,
    x: x,
    y: y,
    width: math.max(1, right - x),
    height: math.max(1, bottom - y),
  );
  return Uint8List.fromList(image.encodeJpg(cropped, quality: 94));
}

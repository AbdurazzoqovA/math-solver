import 'dart:isolate';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import 'camera_capture_screen.dart';
import 'camera_frame_crop.dart';

class CameraCropScreen extends StatefulWidget {
  const CameraCropScreen({
    required this.bytes,
    required this.initialCrop,
    super.key,
  });

  final Uint8List bytes;
  final Rect initialCrop;

  @override
  State<CameraCropScreen> createState() => _CameraCropScreenState();
}

class _CameraCropScreenState extends State<CameraCropScreen> {
  static const _minimumSide = 0.08;
  static const _handleHitRadius = 34.0;

  late Rect _selection = _safeInitialCrop(widget.initialCrop);
  late Uint8List _bytes = widget.bytes;
  ui.Image? _decodedImage;
  _CropDrag? _drag;
  var _isSaving = false;
  Object? _decodeError;

  @override
  void initState() {
    super.initState();
    _decode();
  }

  Future<void> _decode() async {
    try {
      final codec = await ui.instantiateImageCodec(_bytes);
      final frame = await codec.getNextFrame();
      codec.dispose();
      if (!mounted) {
        frame.image.dispose();
        return;
      }
      setState(() => _decodedImage = frame.image);
    } on Object catch (error) {
      if (mounted) setState(() => _decodeError = error);
    }
  }

  @override
  void dispose() {
    _decodedImage?.dispose();
    super.dispose();
  }

  Future<void> _usePhoto() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);
    final selection = _selection;
    try {
      final cropped = await Isolate.run(
        () => cropCameraFrameBytes(
          _bytes,
          left: selection.left,
          top: selection.top,
          width: selection.width,
          height: selection.height,
          maxDimension: 2048,
          quality: 88,
        ),
      );
      if (mounted) Navigator.pop<Uint8List>(context, cropped);
    } on Object {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not crop that photo. Try again.')),
      );
    }
  }

  Future<void> _retake() async {
    final capture = await Navigator.of(context).push<CameraCaptureResult>(
      MaterialPageRoute(builder: (_) => const CameraCaptureScreen()),
    );
    if (capture == null || !mounted) return;
    _decodedImage?.dispose();
    setState(() {
      _bytes = capture.bytes;
      _selection = _safeInitialCrop(capture.initialCrop);
      _decodedImage = null;
      _decodeError = null;
    });
    await _decode();
  }

  @override
  Widget build(BuildContext context) {
    final decoded = _decodedImage;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Select the problem'),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: decoded == null
                  ? _CropLoading(error: _decodeError)
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final imageRect = _containedRect(
                          constraints.biggest,
                          Size(
                            decoded.width.toDouble(),
                            decoded.height.toDouble(),
                          ),
                        );
                        final cropRect = _toDisplayRect(_selection, imageRect);
                        return GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onPanStart: (details) =>
                              _startDrag(details.localPosition, cropRect),
                          onPanUpdate: (details) =>
                              _updateDrag(details.delta, imageRect),
                          onPanEnd: (_) => _drag = null,
                          onPanCancel: () => _drag = null,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              Positioned.fromRect(
                                rect: imageRect,
                                child: Image.memory(
                                  _bytes,
                                  fit: BoxFit.fill,
                                  gaplessPlayback: true,
                                ),
                              ),
                              CustomPaint(
                                painter: _CropOverlayPainter(
                                  imageRect: imageRect,
                                  cropRect: cropRect,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
              child: Column(
                children: [
                  const Text(
                    'The camera frame is already selected. Drag inside to move it or pull a corner to resize.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, height: 1.35),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isSaving ? null : _retake,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white54),
                            minimumSize: const Size.fromHeight(54),
                          ),
                          child: const Text('Retake'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: FilledButton(
                          onPressed: decoded == null || _isSaving
                              ? null
                              : _usePhoto,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.electric,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(54),
                          ),
                          child: _isSaving
                              ? const SizedBox.square(
                                  dimension: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Use selection'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _startDrag(Offset position, Rect cropRect) {
    final handles = <_CropDrag, Offset>{
      _CropDrag.topLeft: cropRect.topLeft,
      _CropDrag.topRight: cropRect.topRight,
      _CropDrag.bottomLeft: cropRect.bottomLeft,
      _CropDrag.bottomRight: cropRect.bottomRight,
    };
    for (final entry in handles.entries) {
      if ((position - entry.value).distance <= _handleHitRadius) {
        _drag = entry.key;
        return;
      }
    }
    _drag = cropRect.contains(position) ? _CropDrag.move : null;
  }

  void _updateDrag(Offset delta, Rect imageRect) {
    final drag = _drag;
    if (drag == null || imageRect.width <= 0 || imageRect.height <= 0) return;
    final dx = delta.dx / imageRect.width;
    final dy = delta.dy / imageRect.height;
    var next = _selection;
    switch (drag) {
      case _CropDrag.move:
        final left = (next.left + dx).clamp(0.0, 1.0 - next.width);
        final top = (next.top + dy).clamp(0.0, 1.0 - next.height);
        next = Rect.fromLTWH(left, top, next.width, next.height);
      case _CropDrag.topLeft:
        next = Rect.fromLTRB(
          (next.left + dx).clamp(0.0, next.right - _minimumSide),
          (next.top + dy).clamp(0.0, next.bottom - _minimumSide),
          next.right,
          next.bottom,
        );
      case _CropDrag.topRight:
        next = Rect.fromLTRB(
          next.left,
          (next.top + dy).clamp(0.0, next.bottom - _minimumSide),
          (next.right + dx).clamp(next.left + _minimumSide, 1.0),
          next.bottom,
        );
      case _CropDrag.bottomLeft:
        next = Rect.fromLTRB(
          (next.left + dx).clamp(0.0, next.right - _minimumSide),
          next.top,
          next.right,
          (next.bottom + dy).clamp(next.top + _minimumSide, 1.0),
        );
      case _CropDrag.bottomRight:
        next = Rect.fromLTRB(
          next.left,
          next.top,
          (next.right + dx).clamp(next.left + _minimumSide, 1.0),
          (next.bottom + dy).clamp(next.top + _minimumSide, 1.0),
        );
    }
    setState(() => _selection = next);
  }
}

enum _CropDrag { move, topLeft, topRight, bottomLeft, bottomRight }

class _CropOverlayPainter extends CustomPainter {
  const _CropOverlayPainter({required this.imageRect, required this.cropRect});

  final Rect imageRect;
  final Rect cropRect;

  @override
  void paint(Canvas canvas, Size size) {
    final shade = Path()
      ..addRect(imageRect)
      ..addRRect(RRect.fromRectAndRadius(cropRect, const Radius.circular(14)))
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(shade, Paint()..color = Colors.black54);
    canvas.drawRRect(
      RRect.fromRectAndRadius(cropRect, const Radius.circular(14)),
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );
    for (final point in [
      cropRect.topLeft,
      cropRect.topRight,
      cropRect.bottomLeft,
      cropRect.bottomRight,
    ]) {
      canvas.drawCircle(point, 9, Paint()..color = AppTheme.electric);
      canvas.drawCircle(
        point,
        9,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }
  }

  @override
  bool shouldRepaint(_CropOverlayPainter oldDelegate) =>
      oldDelegate.imageRect != imageRect || oldDelegate.cropRect != cropRect;
}

class _CropLoading extends StatelessWidget {
  const _CropLoading({required this.error});

  final Object? error;

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return const Center(
        child: Text(
          'Could not open this photo.',
          style: TextStyle(color: Colors.white),
        ),
      );
    }
    return const Center(child: CircularProgressIndicator(color: Colors.white));
  }
}

Rect _safeInitialCrop(Rect crop) {
  final left = crop.left.clamp(0.0, 1.0);
  final top = crop.top.clamp(0.0, 1.0);
  final right = crop.right.clamp(left + 0.01, 1.0);
  final bottom = crop.bottom.clamp(top + 0.01, 1.0);
  return Rect.fromLTRB(left, top, right, bottom);
}

Rect _containedRect(Size available, Size image) {
  if (image.width <= 0 || image.height <= 0) return Offset.zero & available;
  final scale = math.min(
    available.width / image.width,
    available.height / image.height,
  );
  final fitted = Size(image.width * scale, image.height * scale);
  return Rect.fromLTWH(
    (available.width - fitted.width) / 2,
    (available.height - fitted.height) / 2,
    fitted.width,
    fitted.height,
  );
}

Rect _toDisplayRect(Rect normalized, Rect imageRect) => Rect.fromLTRB(
  imageRect.left + normalized.left * imageRect.width,
  imageRect.top + normalized.top * imageRect.height,
  imageRect.left + normalized.right * imageRect.width,
  imageRect.top + normalized.bottom * imageRect.height,
);

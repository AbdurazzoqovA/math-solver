import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'camera_frame_crop.dart';
import 'temporary_image_file.dart';

class CameraCaptureResult {
  const CameraCaptureResult({required this.bytes, required this.initialCrop});

  final Uint8List bytes;
  final Rect initialCrop;
}

enum CameraLifecycleAction { none, initialize, dispose }

@visibleForTesting
CameraLifecycleAction cameraLifecycleAction(
  AppLifecycleState state, {
  required bool hasInitializedCamera,
}) {
  if (state == AppLifecycleState.resumed) {
    return hasInitializedCamera
        ? CameraLifecycleAction.none
        : CameraLifecycleAction.initialize;
  }
  if (state == AppLifecycleState.inactive ||
      state == AppLifecycleState.hidden ||
      state == AppLifecycleState.paused ||
      state == AppLifecycleState.detached) {
    return hasInitializedCamera
        ? CameraLifecycleAction.dispose
        : CameraLifecycleAction.none;
  }
  return CameraLifecycleAction.none;
}

class CameraCaptureScreen extends StatefulWidget {
  const CameraCaptureScreen({
    super.key,
    this.instruction = 'Keep the problem inside the frame — adjust it next',
  });

  final String instruction;

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen>
    with WidgetsBindingObserver {
  CameraController? _camera;
  Object? _error;
  var _isCapturing = false;
  var _flashEnabled = false;
  var _isInitializing = false;
  var _cameraRun = 0;
  Future<void>? _cameraRelease;
  final _previewKey = GlobalKey();
  final _frameKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initialize();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraRun++;
    _camera?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final camera = _camera;
    final action = cameraLifecycleAction(
      state,
      hasInitializedCamera: camera?.value.isInitialized ?? false,
    );
    switch (action) {
      case CameraLifecycleAction.initialize:
        unawaited(_initialize());
      case CameraLifecycleAction.dispose:
        _cameraRelease = _releaseCamera();
      case CameraLifecycleAction.none:
        break;
    }
  }

  Future<void> _initialize() async {
    if (_isInitializing || (_camera?.value.isInitialized ?? false)) return;
    final run = ++_cameraRun;
    _isInitializing = true;
    try {
      await _cameraRelease;
      if (!mounted || run != _cameraRun) return;
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw CameraException('no_camera', 'No camera was found.');
      }
      final back = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final camera = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await camera.initialize();
      final lifecycleState = WidgetsBinding.instance.lifecycleState;
      if (!mounted ||
          run != _cameraRun ||
          (lifecycleState != null &&
              lifecycleState != AppLifecycleState.resumed)) {
        await camera.dispose();
        return;
      }
      setState(() {
        _camera = camera;
        _error = null;
      });
    } on Object catch (error) {
      if (mounted && run == _cameraRun) {
        setState(() => _error = error);
      }
    } finally {
      if (run == _cameraRun) _isInitializing = false;
    }
  }

  Future<void> _releaseCamera() async {
    _cameraRun++;
    _isInitializing = false;
    final camera = _camera;
    _camera = null;
    _flashEnabled = false;
    if (mounted) setState(() {});
    await camera?.dispose();
  }

  Future<void> _toggleFlash() async {
    final camera = _camera;
    if (camera == null || !camera.value.isInitialized) {
      return;
    }
    final enabled = !_flashEnabled;
    try {
      await camera.setFlashMode(enabled ? FlashMode.torch : FlashMode.off);
      if (mounted) {
        setState(() => _flashEnabled = enabled);
      }
    } on CameraException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Flash is unavailable on this camera.')),
        );
      }
    }
  }

  Future<void> _capture() async {
    final camera = _camera;
    if (camera == null || !camera.value.isInitialized || _isCapturing) {
      return;
    }
    setState(() => _isCapturing = true);
    HapticFeedback.mediumImpact();
    try {
      final file = await camera.takePicture();
      final bytes = await readAndDeleteTemporaryImage(file.path);
      final region = _normalizedFrameRegion();
      if (mounted) {
        Navigator.pop<CameraCaptureResult>(
          context,
          CameraCaptureResult(bytes: bytes, initialCrop: region),
        );
      }
    } on Object {
      if (mounted) {
        setState(() => _isCapturing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not take that photo. Try again.'),
          ),
        );
      }
    }
  }

  Rect _normalizedFrameRegion() {
    final previewBox = _previewKey.currentContext?.findRenderObject();
    final frameBox = _frameKey.currentContext?.findRenderObject();
    if (previewBox is! RenderBox || frameBox is! RenderBox) {
      return const Rect.fromLTWH(0.06, 0.23, 0.88, 0.54);
    }
    final previewOrigin = previewBox.localToGlobal(Offset.zero);
    final frameOrigin = frameBox.localToGlobal(Offset.zero);
    return normalizedCameraFrame(
      preview: previewOrigin & previewBox.size,
      frame: frameOrigin & frameBox.size,
    );
  }

  @override
  Widget build(BuildContext context) {
    final camera = _camera;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (camera != null && camera.value.isInitialized)
            Center(child: CameraPreview(camera, key: _previewKey))
          else
            _CameraLoading(error: _error, onRetry: _initialize),
          if (camera != null && camera.value.isInitialized)
            _ProblemFrame(frameKey: _frameKey),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Align(
                alignment: Alignment.topCenter,
                child: Row(
                  children: [
                    _GlassIconButton(
                      tooltip: 'Close camera',
                      onPressed: () => Navigator.pop(context),
                      icon: Icons.close_rounded,
                    ),
                    const Spacer(),
                    _GlassIconButton(
                      tooltip: _flashEnabled
                          ? 'Turn flash off'
                          : 'Turn flash on',
                      onPressed: _toggleFlash,
                      icon: _flashEnabled
                          ? Icons.flash_on_rounded
                          : Icons.flash_off_rounded,
                    ),
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 15,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.56),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        widget.instruction,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Semantics(
                      button: true,
                      label: 'Take problem photo',
                      child: GestureDetector(
                        onTap: _capture,
                        child: Container(
                          width: 82,
                          height: 82,
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 3),
                          ),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: _isCapturing
                                  ? Colors.white54
                                  : Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: _isCapturing
                                ? const Padding(
                                    padding: EdgeInsets.all(20),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 3,
                                      color: Colors.black,
                                    ),
                                  )
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProblemFrame extends StatelessWidget {
  const _ProblemFrame({required this.frameKey});

  final Key frameKey;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FractionallySizedBox(
        widthFactor: 0.88,
        heightFactor: 0.34,
        child: IgnorePointer(
          child: DecoratedBox(
            key: frameKey,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.9),
                width: 2,
              ),
              borderRadius: BorderRadius.circular(26),
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassIconButton extends StatelessWidget {
  const _GlassIconButton({
    required this.tooltip,
    required this.onPressed,
    required this.icon,
  });

  final String tooltip;
  final VoidCallback onPressed;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      style: IconButton.styleFrom(
        backgroundColor: Colors.black.withValues(alpha: 0.5),
        foregroundColor: Colors.white,
      ),
      icon: Icon(icon),
    );
  }
}

class _CameraLoading extends StatelessWidget {
  const _CameraLoading({required this.error, required this.onRetry});

  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (error == null) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.no_photography_outlined,
              color: Colors.white,
              size: 52,
            ),
            const SizedBox(height: 16),
            const Text(
              'Camera unavailable',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Allow camera access in Settings, or import a photo instead.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.72),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

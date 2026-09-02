import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/solve/presentation/camera_capture_screen.dart';

void main() {
  test(
    'camera is initialized again when the app resumes without a controller',
    () {
      expect(
        cameraLifecycleAction(
          AppLifecycleState.resumed,
          hasInitializedCamera: false,
        ),
        CameraLifecycleAction.initialize,
      );
    },
  );

  test(
    'camera resources are released whenever the app leaves the foreground',
    () {
      for (final state in [
        AppLifecycleState.inactive,
        AppLifecycleState.hidden,
        AppLifecycleState.paused,
        AppLifecycleState.detached,
      ]) {
        expect(
          cameraLifecycleAction(state, hasInitializedCamera: true),
          CameraLifecycleAction.dispose,
          reason: '$state must not retain the camera',
        );
      }
    },
  );

  test('resume does not replace a camera that is already initialized', () {
    expect(
      cameraLifecycleAction(
        AppLifecycleState.resumed,
        hasInitializedCamera: true,
      ),
      CameraLifecycleAction.none,
    );
  });
}

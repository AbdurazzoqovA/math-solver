import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:mathsolver_mobile/features/solve/presentation/camera_crop_screen.dart';

void main() {
  testWidgets('camera capture shows the full-photo adjustable crop screen', (
    tester,
  ) async {
    final source = image.Image(width: 100, height: 200);
    image.fill(source, color: image.ColorRgb8(250, 250, 250));
    final bytes = Uint8List.fromList(image.encodeJpg(source));
    Uint8List? result;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: FilledButton(
              onPressed: () async {
                result = await Navigator.of(context).push<Uint8List>(
                  MaterialPageRoute(
                    builder: (_) => CameraCropScreen(
                      bytes: bytes,
                      initialCrop: const Rect.fromLTWH(0.1, 0.2, 0.8, 0.5),
                    ),
                  ),
                );
              },
              child: const Text('Open crop'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open crop'));
    await tester.pump(const Duration(milliseconds: 400));
    for (var attempt = 0; attempt < 20; attempt++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pump();
      if (find.byType(CircularProgressIndicator).evaluate().isEmpty) break;
    }

    expect(find.text('Select the problem'), findsOneWidget);
    expect(find.text('Use selection'), findsOneWidget);
    expect(find.textContaining('pull a corner to resize'), findsOneWidget);
    final useSelection = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Use selection'),
    );
    expect(useSelection.onPressed, isNotNull);

    await tester.tap(find.text('Use selection'));
    await tester.pump();
    for (var attempt = 0; attempt < 40 && result == null; attempt++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pump(const Duration(milliseconds: 20));
    }
    expect(find.text('Could not crop that photo. Try again.'), findsNothing);
    expect(result, isNotNull);
    final cropped = image.decodeImage(result!);
    expect(cropped, isNotNull);
    expect(cropped!.width, 80);
    expect(cropped.height, 100);
  });
}

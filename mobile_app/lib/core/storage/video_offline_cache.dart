import 'dart:io';

import 'package:path_provider/path_provider.dart';

abstract final class VideoOfflineCache {
  static Future<Directory> directory() async {
    final root = await getApplicationDocumentsDirectory();
    final value = Directory('${root.path}/private-video-lessons');
    if (!await value.exists()) {
      await value.create(recursive: true);
    }
    return value;
  }

  static String cacheKey(String lessonId, String clipId) {
    return '${_safe(lessonId)}_${_safe(clipId)}';
  }

  static Future<File> file(
    String lessonId,
    String clipId,
    String extension,
  ) async {
    final root = await directory();
    return File('${root.path}/${cacheKey(lessonId, clipId)}.$extension');
  }

  static Future<void> deleteLesson(String lessonId) async {
    final root = await directory();
    final prefix = '${_safe(lessonId)}_';
    await for (final entity in root.list()) {
      if (entity is File && entity.uri.pathSegments.last.startsWith(prefix)) {
        await entity.delete();
      }
    }
  }

  static Future<void> clearAll() async {
    final root = await directory();
    if (await root.exists()) {
      await root.delete(recursive: true);
    }
  }

  static String _safe(String value) =>
      value.replaceAll(RegExp('[^a-zA-Z0-9_-]'), '_');
}

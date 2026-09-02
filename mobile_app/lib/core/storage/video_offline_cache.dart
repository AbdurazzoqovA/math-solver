import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../../features/video/domain/video_lesson.dart';

class OfflineVideoLesson {
  const OfflineVideoLesson({
    required this.ownerUserId,
    required this.jobId,
    required this.lesson,
    required this.savedClipIds,
    required this.savedAt,
  });

  final String ownerUserId;
  final String jobId;
  final VideoLessonManifest lesson;
  final Set<String> savedClipIds;
  final DateTime savedAt;

  double get durationSeconds =>
      lesson.clips.fold(0, (total, clip) => total + clip.durationSeconds);
}

abstract final class VideoOfflineCache {
  static const _schemaVersion = 2;
  static const _directoryName = 'private-video-lessons-v2';
  static const _legacyDirectoryName = 'private-video-lessons';

  static Future<Directory> directory({Directory? rootDirectory}) async {
    final root = rootDirectory ?? await getApplicationDocumentsDirectory();
    final value = Directory('${root.path}/$_directoryName');
    if (!await value.exists()) {
      await value.create(recursive: true);
    }
    return value;
  }

  static String cacheKey(String ownerUserId, String lessonId, String clipId) =>
      '${_encoded(ownerUserId)}_${_encoded(lessonId)}_${_encoded(clipId)}';

  static Future<File> file({
    required String ownerUserId,
    required String lessonId,
    required String clipId,
    required String extension,
    Directory? rootDirectory,
  }) async {
    if (!RegExp(r'^[a-z0-9]+$').hasMatch(extension)) {
      throw ArgumentError.value(extension, 'extension');
    }
    final owner = await _ownerDirectory(
      ownerUserId,
      rootDirectory: rootDirectory,
    );
    return File(
      '${owner.path}/${_encoded(lessonId)}_${_encoded(clipId)}.$extension',
    );
  }

  static Future<File> saveClip({
    required String ownerUserId,
    required VideoLessonManifest lesson,
    required VideoLessonClip clip,
    required List<int> videoBytes,
    String? captions,
    DateTime? savedAt,
    Directory? rootDirectory,
  }) async {
    if (ownerUserId.isEmpty || lesson.lessonId.isEmpty || clip.id.isEmpty) {
      throw ArgumentError('The owner, lesson, and clip IDs are required.');
    }
    if (!lesson.clips.any((item) => item.id == clip.id)) {
      throw ArgumentError('The clip must belong to the saved lesson.');
    }
    if (videoBytes.isEmpty) {
      throw ArgumentError('The offline video cannot be empty.');
    }

    final video = await file(
      ownerUserId: ownerUserId,
      lessonId: lesson.lessonId,
      clipId: clip.id,
      extension: 'mp4',
      rootDirectory: rootDirectory,
    );
    await _atomicWriteBytes(video, videoBytes);

    if (captions != null) {
      final captionFile = await file(
        ownerUserId: ownerUserId,
        lessonId: lesson.lessonId,
        clipId: clip.id,
        extension: 'vtt',
        rootDirectory: rootDirectory,
      );
      await _atomicWriteString(captionFile, captions);
    }

    final existing = await loadLesson(
      ownerUserId: ownerUserId,
      lessonId: lesson.lessonId,
      rootDirectory: rootDirectory,
    );
    final savedClipIds = <String>{...?existing?.savedClipIds, clip.id};
    final metadata = await _metadataFile(
      ownerUserId,
      lesson.lessonId,
      rootDirectory: rootDirectory,
    );
    await _atomicWriteString(
      metadata,
      jsonEncode({
        'schemaVersion': _schemaVersion,
        'ownerUserId': ownerUserId,
        'jobId': lesson.lessonId,
        'savedAt': (savedAt ?? DateTime.now().toUtc()).toIso8601String(),
        'savedClipIds': savedClipIds.toList(growable: false),
        'lesson': _manifestToJson(lesson),
      }),
    );
    return video;
  }

  static Future<OfflineVideoLesson?> loadLesson({
    required String ownerUserId,
    required String lessonId,
    Directory? rootDirectory,
  }) async {
    if (ownerUserId.isEmpty || lessonId.isEmpty) return null;
    final metadata = await _metadataFile(
      ownerUserId,
      lessonId,
      rootDirectory: rootDirectory,
    );
    if (!await metadata.exists()) return null;
    try {
      final decoded = jsonDecode(await metadata.readAsString());
      if (decoded is! Map) return null;
      final json = decoded.map((key, value) => MapEntry('$key', value));
      if (json['schemaVersion'] != _schemaVersion ||
          json['ownerUserId'] != ownerUserId ||
          json['jobId'] != lessonId ||
          json['lesson'] is! Map ||
          json['savedClipIds'] is! List) {
        return null;
      }
      final lesson = VideoLessonManifest.fromJson(
        (json['lesson'] as Map).map((key, value) => MapEntry('$key', value)),
      );
      if (lesson.lessonId != lessonId) return null;

      final declaredClipIds = (json['savedClipIds'] as List)
          .whereType<String>()
          .toSet();
      final savedClips = <VideoLessonClip>[];
      for (final clip in lesson.clips) {
        if (!declaredClipIds.contains(clip.id)) continue;
        final video = await file(
          ownerUserId: ownerUserId,
          lessonId: lessonId,
          clipId: clip.id,
          extension: 'mp4',
          rootDirectory: rootDirectory,
        );
        if (await video.exists() && await video.length() > 0) {
          savedClips.add(clip);
        }
      }
      if (savedClips.isEmpty) return null;
      final availableIds = savedClips.map((clip) => clip.id).toSet();
      final playableLesson = VideoLessonManifest(
        lessonId: lesson.lessonId,
        title: lesson.title,
        problem: lesson.problem,
        learningGoal: lesson.learningGoal,
        disclosure: lesson.disclosure,
        clips: savedClips,
        interactions: lesson.interactions
            .where(
              (interaction) => availableIds.contains(interaction.afterClip),
            )
            .toList(growable: false),
        transferCheck: lesson.transferCheck,
        completionTitle: lesson.completionTitle,
        completionBody: lesson.completionBody,
      );
      final parsedSavedAt = DateTime.tryParse('${json['savedAt']}');
      return OfflineVideoLesson(
        ownerUserId: ownerUserId,
        jobId: lessonId,
        lesson: playableLesson,
        savedClipIds: availableIds,
        savedAt:
            parsedSavedAt?.toUtc() ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      );
    } on Object {
      return null;
    }
  }

  static Future<List<OfflineVideoLesson>> listLessons({
    required String ownerUserId,
    Directory? rootDirectory,
  }) async {
    if (ownerUserId.isEmpty) return const [];
    final owner = await _ownerDirectory(
      ownerUserId,
      rootDirectory: rootDirectory,
    );
    final lessons = <OfflineVideoLesson>[];
    await for (final entity in owner.list()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      try {
        final decoded = jsonDecode(await entity.readAsString());
        if (decoded is! Map || decoded['jobId'] is! String) continue;
        final lesson = await loadLesson(
          ownerUserId: ownerUserId,
          lessonId: decoded['jobId'] as String,
          rootDirectory: rootDirectory,
        );
        if (lesson != null) lessons.add(lesson);
      } on Object {
        // One corrupt record must not hide the other saved lessons.
      }
    }
    lessons.sort((a, b) => b.savedAt.compareTo(a.savedAt));
    return lessons;
  }

  static Future<void> deleteLesson({
    required String ownerUserId,
    required String lessonId,
    Directory? rootDirectory,
  }) async {
    final owner = await _ownerDirectory(
      ownerUserId,
      rootDirectory: rootDirectory,
    );
    final prefix = '${_encoded(lessonId)}_';
    final metadataName = '${_encoded(lessonId)}.json';
    await for (final entity in owner.list()) {
      if (entity is! File) continue;
      final name = entity.uri.pathSegments.last;
      if (name == metadataName || name.startsWith(prefix)) {
        await entity.delete();
      }
    }
  }

  static Future<void> clearAll({Directory? rootDirectory}) async {
    final root = rootDirectory ?? await getApplicationDocumentsDirectory();
    for (final name in [_directoryName, _legacyDirectoryName]) {
      final value = Directory('${root.path}/$name');
      if (await value.exists()) {
        await value.delete(recursive: true);
      }
    }
  }

  static Future<void> clearOwner({
    required String ownerUserId,
    Directory? rootDirectory,
  }) async {
    if (ownerUserId.isEmpty) return;
    final root = rootDirectory ?? await getApplicationDocumentsDirectory();
    final owner = Directory(
      '${root.path}/$_directoryName/${_encoded(ownerUserId)}',
    );
    if (await owner.exists()) await owner.delete(recursive: true);

    // Legacy files were never owner-scoped and are never readable by v2. They
    // cannot safely be attributed to another account, so remove only that
    // unusable legacy directory while preserving every other v2 owner.
    final legacy = Directory('${root.path}/$_legacyDirectoryName');
    if (await legacy.exists()) await legacy.delete(recursive: true);
  }

  static Future<Directory> _ownerDirectory(
    String ownerUserId, {
    Directory? rootDirectory,
  }) async {
    final root = await directory(rootDirectory: rootDirectory);
    final owner = Directory('${root.path}/${_encoded(ownerUserId)}');
    if (!await owner.exists()) await owner.create(recursive: true);
    return owner;
  }

  static Future<File> _metadataFile(
    String ownerUserId,
    String lessonId, {
    Directory? rootDirectory,
  }) async {
    final owner = await _ownerDirectory(
      ownerUserId,
      rootDirectory: rootDirectory,
    );
    return File('${owner.path}/${_encoded(lessonId)}.json');
  }

  static Future<void> _atomicWriteBytes(File target, List<int> bytes) async {
    final temporary = File(
      '${target.path}.${DateTime.now().microsecondsSinceEpoch}.part',
    );
    try {
      await temporary.writeAsBytes(bytes, flush: true);
      await temporary.rename(target.path);
    } finally {
      if (await temporary.exists()) await temporary.delete();
    }
  }

  static Future<void> _atomicWriteString(File target, String value) async {
    final temporary = File(
      '${target.path}.${DateTime.now().microsecondsSinceEpoch}.part',
    );
    try {
      await temporary.writeAsString(value, flush: true);
      await temporary.rename(target.path);
    } finally {
      if (await temporary.exists()) await temporary.delete();
    }
  }

  static String _encoded(String value) =>
      base64Url.encode(utf8.encode(value)).replaceAll('=', '');

  static Map<String, Object?> _manifestToJson(VideoLessonManifest lesson) => {
    'lessonId': lesson.lessonId,
    'title': lesson.title,
    'problem': lesson.problem,
    'learningGoal': lesson.learningGoal,
    'disclosure': lesson.disclosure,
    'clips': lesson.clips.map(_clipToJson).toList(growable: false),
    'interactions': lesson.interactions
        .map(_interactionToJson)
        .toList(growable: false),
    'transferCheck': _interactionToJson(lesson.transferCheck),
    'completion': {
      'title': lesson.completionTitle,
      'body': lesson.completionBody,
    },
  };

  static Map<String, Object?> _clipToJson(VideoLessonClip clip) => {
    'id': clip.id,
    'step': clip.step,
    'title': clip.title,
    'durationSeconds': clip.durationSeconds,
    'videoUrl': clip.videoUrl,
    'captionsUrl': clip.captionsUrl,
    'posterUrl': clip.posterUrl,
  };

  static Map<String, Object?> _interactionToJson(
    VideoLessonInteraction interaction,
  ) => {
    'id': interaction.id,
    'afterClip': interaction.afterClip,
    'eyebrow': interaction.eyebrow,
    if (interaction.problem != null) 'problem': interaction.problem,
    'prompt': interaction.prompt,
    'options': interaction.options
        .map((option) => {'id': option.id, 'label': option.label})
        .toList(growable: false),
    'correctOptionId': interaction.correctOptionId,
    'correctFeedback': interaction.correctFeedback,
    'incorrectFeedback': interaction.incorrectFeedback,
  };
}

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/storage/video_offline_cache.dart';
import 'package:mathsolver_mobile/features/video/domain/video_lesson.dart';

void main() {
  late Directory testRoot;

  setUp(() async {
    testRoot = await Directory.systemTemp.createTemp('video-offline-cache-');
  });

  tearDown(() async {
    if (await testRoot.exists()) await testRoot.delete(recursive: true);
  });

  test('cache keys isolate owners and cannot escape the private directory', () {
    expect(
      VideoOfflineCache.cacheKey('account-a', 'lesson', 'clip'),
      isNot(VideoOfflineCache.cacheKey('account-b', 'lesson', 'clip')),
    );
    expect(
      VideoOfflineCache.cacheKey('../owner', '../lesson', '../clip'),
      isNot(contains('/')),
    );
    expect(
      VideoOfflineCache.cacheKey('../owner', '../lesson', '../clip'),
      isNot(contains('..')),
    );
  });

  test(
    'a saved lesson reconstructs from disk after in-memory state is gone',
    () async {
      final lesson = _lesson();
      await VideoOfflineCache.saveClip(
        ownerUserId: 'account-a',
        lesson: lesson,
        clip: lesson.clips.first,
        videoBytes: const [1, 2, 3, 4],
        captions: 'WEBVTT\n\n00:00.000 --> 00:01.000\nTwo plus two.',
        savedAt: DateTime.utc(2026, 8, 25, 10),
        rootDirectory: testRoot,
      );

      final restored = await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-a',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      );
      final listed = await VideoOfflineCache.listLessons(
        ownerUserId: 'account-a',
        rootDirectory: testRoot,
      );
      final captions = await VideoOfflineCache.file(
        ownerUserId: 'account-a',
        lessonId: lesson.lessonId,
        clipId: lesson.clips.first.id,
        extension: 'vtt',
        rootDirectory: testRoot,
      );

      expect(restored, isNotNull);
      expect(restored!.jobId, lesson.lessonId);
      expect(restored.ownerUserId, 'account-a');
      expect(restored.lesson.title, 'Add two numbers');
      expect(restored.lesson.problem, '2 + 2');
      expect(restored.lesson.clips.map((clip) => clip.id), ['clip-1']);
      expect(restored.lesson.interactions.map((item) => item.id), ['check-1']);
      expect(restored.savedClipIds, {'clip-1'});
      expect(restored.savedAt, DateTime.utc(2026, 8, 25, 10));
      expect(listed.single.jobId, lesson.lessonId);
      expect(await captions.readAsString(), startsWith('WEBVTT'));
    },
  );

  test('the same lesson ID remains private to its owning account', () async {
    final lesson = _lesson();
    await VideoOfflineCache.saveClip(
      ownerUserId: 'account-a',
      lesson: lesson,
      clip: lesson.clips.first,
      videoBytes: const [1],
      rootDirectory: testRoot,
    );
    await VideoOfflineCache.saveClip(
      ownerUserId: 'account-b',
      lesson: lesson,
      clip: lesson.clips.last,
      videoBytes: const [2],
      rootDirectory: testRoot,
    );

    final accountA = await VideoOfflineCache.loadLesson(
      ownerUserId: 'account-a',
      lessonId: lesson.lessonId,
      rootDirectory: testRoot,
    );
    final accountB = await VideoOfflineCache.loadLesson(
      ownerUserId: 'account-b',
      lessonId: lesson.lessonId,
      rootDirectory: testRoot,
    );

    expect(accountA!.lesson.clips.single.id, 'clip-1');
    expect(accountB!.lesson.clips.single.id, 'clip-2');

    await VideoOfflineCache.deleteLesson(
      ownerUserId: 'account-a',
      lessonId: lesson.lessonId,
      rootDirectory: testRoot,
    );
    expect(
      await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-a',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      ),
      isNull,
    );
    expect(
      await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-b',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      ),
      isNotNull,
    );
  });

  test('owner cleanup preserves every other account cache', () async {
    final lesson = _lesson();
    await VideoOfflineCache.saveClip(
      ownerUserId: 'account-a',
      lesson: lesson,
      clip: lesson.clips.first,
      videoBytes: const [1],
      rootDirectory: testRoot,
    );
    await VideoOfflineCache.saveClip(
      ownerUserId: 'account-b',
      lesson: lesson,
      clip: lesson.clips.last,
      videoBytes: const [2],
      rootDirectory: testRoot,
    );

    await VideoOfflineCache.clearOwner(
      ownerUserId: 'account-a',
      rootDirectory: testRoot,
    );

    expect(
      await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-a',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      ),
      isNull,
    );
    expect(
      await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-b',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      ),
      isNotNull,
    );
  });

  test('missing video data makes a stale manifest unavailable', () async {
    final lesson = _lesson();
    await VideoOfflineCache.saveClip(
      ownerUserId: 'account-a',
      lesson: lesson,
      clip: lesson.clips.first,
      videoBytes: const [1, 2, 3],
      rootDirectory: testRoot,
    );
    final video = await VideoOfflineCache.file(
      ownerUserId: 'account-a',
      lessonId: lesson.lessonId,
      clipId: lesson.clips.first.id,
      extension: 'mp4',
      rootDirectory: testRoot,
    );
    await video.delete();

    expect(
      await VideoOfflineCache.loadLesson(
        ownerUserId: 'account-a',
        lessonId: lesson.lessonId,
        rootDirectory: testRoot,
      ),
      isNull,
    );
    expect(
      await VideoOfflineCache.listLessons(
        ownerUserId: 'account-a',
        rootDirectory: testRoot,
      ),
      isEmpty,
    );
  });

  test(
    'legacy unscoped files are never listed and clearAll removes them',
    () async {
      final legacy = Directory('${testRoot.path}/private-video-lessons');
      await legacy.create(recursive: true);
      await File(
        '${legacy.path}/lesson_clip.mp4',
      ).writeAsBytes(const [1, 2, 3]);

      expect(
        await VideoOfflineCache.listLessons(
          ownerUserId: 'account-a',
          rootDirectory: testRoot,
        ),
        isEmpty,
      );

      await VideoOfflineCache.clearAll(rootDirectory: testRoot);

      expect(await legacy.exists(), isFalse);
      expect(
        await Directory('${testRoot.path}/private-video-lessons-v2').exists(),
        isFalse,
      );
    },
  );
}

VideoLessonManifest _lesson() {
  const options = [
    VideoLessonOption(id: 'a', label: '4'),
    VideoLessonOption(id: 'b', label: '5'),
  ];
  return const VideoLessonManifest(
    lessonId: '1111111111111111111111111111111111111111',
    title: 'Add two numbers',
    problem: '2 + 2',
    learningGoal: 'Understand addition.',
    disclosure: 'AI-generated and reviewed.',
    clips: [
      VideoLessonClip(
        id: 'clip-1',
        step: 1,
        title: 'Add',
        durationSeconds: 4,
        videoUrl: 'https://example.com/clip-1.mp4',
        captionsUrl: 'https://example.com/clip-1.vtt',
        posterUrl: 'https://example.com/clip-1.jpg',
      ),
      VideoLessonClip(
        id: 'clip-2',
        step: 2,
        title: 'Check',
        durationSeconds: 3,
        videoUrl: 'https://example.com/clip-2.mp4',
        captionsUrl: 'https://example.com/clip-2.vtt',
        posterUrl: 'https://example.com/clip-2.jpg',
      ),
    ],
    interactions: [
      VideoLessonInteraction(
        id: 'check-1',
        afterClip: 'clip-1',
        eyebrow: 'Quick check',
        prompt: 'What is the answer?',
        options: options,
        correctOptionId: 'a',
        correctFeedback: 'Correct.',
        incorrectFeedback: 'Try again.',
      ),
      VideoLessonInteraction(
        id: 'check-2',
        afterClip: 'clip-2',
        eyebrow: 'Quick check',
        prompt: 'Still four?',
        options: options,
        correctOptionId: 'a',
        correctFeedback: 'Correct.',
        incorrectFeedback: 'Try again.',
      ),
    ],
    transferCheck: VideoLessonInteraction(
      id: 'transfer',
      afterClip: 'clip-2',
      eyebrow: 'Your turn',
      prompt: 'What is 3 + 2?',
      options: options,
      correctOptionId: 'b',
      correctFeedback: 'Correct.',
      incorrectFeedback: 'Try again.',
    ),
    completionTitle: 'Complete',
    completionBody: 'You understand addition.',
  );
}

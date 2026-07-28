import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/features/video/domain/video_lesson.dart';

void main() {
  test('parses a ready interactive lesson from the web video contract', () {
    final job = VideoJob.fromJson({
      'id': 'job-1',
      'status': 'ready',
      'progress': 1,
      'stageLabel': 'Ready to watch',
      'createdAt': 1000,
      'updatedAt': 2000,
      'expiresAt': 3000,
      'quota': {'used': 2, 'limit': 5, 'remaining': 3},
      'lesson': {
        'lessonId': 'lesson-1',
        'title': 'Factor the quadratic',
        'problem': 'x² - 5x + 6 = 0',
        'learningGoal': 'See why the factors work.',
        'disclosure': 'AI-generated and reviewed.',
        'clips': [
          {
            'id': 'clip-1',
            'step': 1,
            'title': 'Find the pair',
            'durationSeconds': 12.5,
            'videoUrl': 'https://example.com/clip.mp4',
            'captionsUrl': 'https://example.com/clip.vtt',
            'posterUrl': 'https://example.com/poster.jpg',
          },
        ],
        'interactions': [
          {
            'id': 'check-1',
            'afterClip': 'clip-1',
            'eyebrow': 'Quick check',
            'prompt': 'Which pair multiplies to 6?',
            'options': [
              {'id': 'a', 'label': '2 and 3'},
              {'id': 'b', 'label': '1 and 6'},
            ],
            'correctOptionId': 'a',
            'correctFeedback': 'Exactly.',
            'incorrectFeedback': 'Try the pair that also adds to 5.',
          },
        ],
        'transferCheck': {
          'id': 'transfer-1',
          'afterClip': 'clip-1',
          'eyebrow': 'Your turn',
          'problem': 'x² - 7x + 12 = 0',
          'prompt': 'Which factorization works?',
          'options': [
            {'id': 'a', 'label': '(x - 3)(x - 4)'},
          ],
          'correctOptionId': 'a',
          'correctFeedback': 'You have it.',
          'incorrectFeedback': 'Check the sum.',
        },
        'completion': {
          'title': 'Idea unlocked',
          'body': 'Now try the same pattern.',
        },
      },
    });

    expect(job.status, VideoJobStatus.ready);
    expect(job.status.isTerminal, isTrue);
    expect(job.quota.remaining, 3);
    expect(job.lesson?.clips.single.durationSeconds, 12.5);
    expect(job.lesson?.interactions.single.options.first.id, 'a');
    expect(job.lesson?.transferCheck.problem, 'x² - 7x + 12 = 0');
  });

  test('distinguishes active and terminal rendering states', () {
    expect(VideoJobStatus.rendering.isActive, isTrue);
    expect(VideoJobStatus.failed.isTerminal, isTrue);
    expect(VideoJobStatus.unsupported.isTerminal, isTrue);
  });
}

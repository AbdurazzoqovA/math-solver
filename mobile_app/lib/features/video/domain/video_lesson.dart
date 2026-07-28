enum VideoJobStatus {
  queued,
  planning,
  voicing,
  rendering,
  verifying,
  uploading,
  ready,
  unsupported,
  failed;

  bool get isTerminal =>
      this == VideoJobStatus.ready ||
      this == VideoJobStatus.unsupported ||
      this == VideoJobStatus.failed;

  bool get isActive => !isTerminal;

  static VideoJobStatus parse(Object? value) {
    return values.firstWhere(
      (status) => status.name == value,
      orElse: () => VideoJobStatus.failed,
    );
  }
}

class VideoQuota {
  const VideoQuota({
    required this.used,
    required this.limit,
    required this.remaining,
  });

  final int used;
  final int limit;
  final int remaining;

  factory VideoQuota.fromJson(Map<String, Object?> json) {
    return VideoQuota(
      used: _int(json['used']),
      limit: _int(json['limit']),
      remaining: _int(json['remaining']),
    );
  }
}

class VideoLessonOption {
  const VideoLessonOption({required this.id, required this.label});

  final String id;
  final String label;

  factory VideoLessonOption.fromJson(Map<String, Object?> json) {
    return VideoLessonOption(
      id: _string(json['id']),
      label: _string(json['label']),
    );
  }
}

class VideoLessonInteraction {
  const VideoLessonInteraction({
    required this.id,
    required this.afterClip,
    required this.eyebrow,
    required this.prompt,
    required this.options,
    required this.correctOptionId,
    required this.correctFeedback,
    required this.incorrectFeedback,
    this.problem,
  });

  final String id;
  final String afterClip;
  final String eyebrow;
  final String? problem;
  final String prompt;
  final List<VideoLessonOption> options;
  final String correctOptionId;
  final String correctFeedback;
  final String incorrectFeedback;

  factory VideoLessonInteraction.fromJson(Map<String, Object?> json) {
    final options = json['options'];
    return VideoLessonInteraction(
      id: _string(json['id']),
      afterClip: _string(json['afterClip']),
      eyebrow: _string(json['eyebrow']),
      problem: json['problem'] is String ? json['problem'] as String : null,
      prompt: _string(json['prompt']),
      options: options is List
          ? options
                .whereType<Map>()
                .map((item) => VideoLessonOption.fromJson(_map(item)))
                .toList(growable: false)
          : const [],
      correctOptionId: _string(json['correctOptionId']),
      correctFeedback: _string(json['correctFeedback']),
      incorrectFeedback: _string(json['incorrectFeedback']),
    );
  }
}

class VideoLessonClip {
  const VideoLessonClip({
    required this.id,
    required this.step,
    required this.title,
    required this.durationSeconds,
    required this.videoUrl,
    required this.captionsUrl,
    required this.posterUrl,
  });

  final String id;
  final int step;
  final String title;
  final double durationSeconds;
  final String videoUrl;
  final String captionsUrl;
  final String posterUrl;

  factory VideoLessonClip.fromJson(Map<String, Object?> json) {
    return VideoLessonClip(
      id: _string(json['id']),
      step: _int(json['step']),
      title: _string(json['title']),
      durationSeconds: _double(json['durationSeconds']),
      videoUrl: _string(json['videoUrl']),
      captionsUrl: _string(json['captionsUrl']),
      posterUrl: _string(json['posterUrl']),
    );
  }
}

class VideoLessonManifest {
  const VideoLessonManifest({
    required this.lessonId,
    required this.title,
    required this.problem,
    required this.learningGoal,
    required this.disclosure,
    required this.clips,
    required this.interactions,
    required this.transferCheck,
    required this.completionTitle,
    required this.completionBody,
  });

  final String lessonId;
  final String title;
  final String problem;
  final String learningGoal;
  final String disclosure;
  final List<VideoLessonClip> clips;
  final List<VideoLessonInteraction> interactions;
  final VideoLessonInteraction transferCheck;
  final String completionTitle;
  final String completionBody;

  factory VideoLessonManifest.fromJson(Map<String, Object?> json) {
    final clips = json['clips'];
    final interactions = json['interactions'];
    final transfer = _map(json['transferCheck']);
    final completion = _map(json['completion']);
    return VideoLessonManifest(
      lessonId: _string(json['lessonId']),
      title: _string(json['title']),
      problem: _string(json['problem']),
      learningGoal: _string(json['learningGoal']),
      disclosure: _string(json['disclosure']),
      clips: clips is List
          ? clips
                .whereType<Map>()
                .map((item) => VideoLessonClip.fromJson(_map(item)))
                .toList(growable: false)
          : const [],
      interactions: interactions is List
          ? interactions
                .whereType<Map>()
                .map((item) => VideoLessonInteraction.fromJson(_map(item)))
                .toList(growable: false)
          : const [],
      transferCheck: VideoLessonInteraction.fromJson(transfer),
      completionTitle: _string(completion['title']),
      completionBody: _string(completion['body']),
    );
  }
}

class VideoJobError {
  const VideoJobError({
    required this.code,
    required this.message,
    required this.retryable,
  });

  final String code;
  final String message;
  final bool retryable;

  factory VideoJobError.fromJson(Map<String, Object?> json) {
    return VideoJobError(
      code: _string(json['code']),
      message: _string(json['message']),
      retryable: json['retryable'] == true,
    );
  }
}

class VideoJob {
  const VideoJob({
    required this.id,
    required this.status,
    required this.progress,
    required this.stageLabel,
    required this.createdAt,
    required this.updatedAt,
    required this.expiresAt,
    required this.quota,
    this.error,
    this.lesson,
  });

  final String id;
  final VideoJobStatus status;
  final double progress;
  final String stageLabel;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime expiresAt;
  final VideoQuota quota;
  final VideoJobError? error;
  final VideoLessonManifest? lesson;

  factory VideoJob.fromJson(Map<String, Object?> json) {
    final error = json['error'];
    final lesson = json['lesson'];
    return VideoJob(
      id: _string(json['id']),
      status: VideoJobStatus.parse(json['status']),
      progress: _double(json['progress']),
      stageLabel: _string(json['stageLabel']),
      createdAt: _date(json['createdAt']),
      updatedAt: _date(json['updatedAt']),
      expiresAt: _date(json['expiresAt']),
      quota: VideoQuota.fromJson(_map(json['quota'])),
      error: error is Map ? VideoJobError.fromJson(_map(error)) : null,
      lesson: lesson is Map ? VideoLessonManifest.fromJson(_map(lesson)) : null,
    );
  }
}

class VideoJobSummary {
  const VideoJobSummary({
    required this.id,
    required this.title,
    required this.problem,
    required this.status,
    required this.progress,
    required this.stageLabel,
    required this.updatedAt,
    this.posterUrl,
    this.clipCount,
    this.durationSeconds,
    this.error,
  });

  final String id;
  final String title;
  final String problem;
  final VideoJobStatus status;
  final double progress;
  final String stageLabel;
  final DateTime updatedAt;
  final String? posterUrl;
  final int? clipCount;
  final double? durationSeconds;
  final VideoJobError? error;

  factory VideoJobSummary.fromJson(Map<String, Object?> json) {
    final error = json['error'];
    return VideoJobSummary(
      id: _string(json['id']),
      title: _string(json['title']),
      problem: _string(json['problem']),
      status: VideoJobStatus.parse(json['status']),
      progress: _double(json['progress']),
      stageLabel: _string(json['stageLabel']),
      updatedAt: _date(json['updatedAt']),
      posterUrl: json['posterUrl'] is String
          ? json['posterUrl'] as String
          : null,
      clipCount: json['clipCount'] is num
          ? (json['clipCount'] as num).toInt()
          : null,
      durationSeconds: json['durationSeconds'] is num
          ? (json['durationSeconds'] as num).toDouble()
          : null,
      error: error is Map ? VideoJobError.fromJson(_map(error)) : null,
    );
  }
}

class VideoJobList {
  const VideoJobList({required this.jobs, required this.quota});

  final List<VideoJobSummary> jobs;
  final VideoQuota quota;

  factory VideoJobList.fromJson(Map<String, Object?> json) {
    final jobs = json['jobs'];
    return VideoJobList(
      jobs: jobs is List
          ? jobs
                .whereType<Map>()
                .map((item) => VideoJobSummary.fromJson(_map(item)))
                .toList(growable: false)
          : const [],
      quota: VideoQuota.fromJson(_map(json['quota'])),
    );
  }
}

Map<String, Object?> _map(Object? value) {
  if (value is Map) {
    return value.map((key, item) => MapEntry('$key', item));
  }
  return const {};
}

String _string(Object? value) => value is String ? value : '';

int _int(Object? value) => value is num ? value.toInt() : 0;

double _double(Object? value) => value is num ? value.toDouble() : 0;

DateTime _date(Object? value) {
  final milliseconds = value is num ? value.toInt() : 0;
  return DateTime.fromMillisecondsSinceEpoch(milliseconds);
}

export const VIDEO_JOB_STATUSES = [
  "queued",
  "planning",
  "voicing",
  "rendering",
  "verifying",
  "uploading",
  "ready",
  "unsupported",
  "failed",
] as const;

export type VideoJobStatus = (typeof VIDEO_JOB_STATUSES)[number];

export type VideoLessonOption = {
  id: string;
  label: string;
};

export type VideoLessonInteraction = {
  id: string;
  afterClip: string;
  eyebrow: string;
  problem?: string;
  prompt: string;
  options: VideoLessonOption[];
  correctOptionId: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

export type StoredVideoLessonClip = {
  id: string;
  step: number;
  title: string;
  durationSeconds: number;
  videoObjectKey: string;
  captionsObjectKey: string;
  posterObjectKey: string;
};

export type StoredVideoLessonManifest = {
  schemaVersion: 1;
  lessonId: string;
  title: string;
  problem: string;
  learningGoal: string;
  disclosure: string;
  clips: StoredVideoLessonClip[];
  interactions: VideoLessonInteraction[];
  transferCheck: VideoLessonInteraction;
  completion: {
    title: string;
    body: string;
  };
};

export type PlaybackVideoLessonClip = Omit<
  StoredVideoLessonClip,
  "videoObjectKey" | "captionsObjectKey" | "posterObjectKey"
> & {
  videoUrl: string;
  captionsUrl: string;
  posterUrl: string;
};

export type PlaybackVideoLessonManifest = Omit<
  StoredVideoLessonManifest,
  "clips"
> & {
  clips: PlaybackVideoLessonClip[];
};

export type VideoJobError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type VideoJobDocument = {
  schemaVersion: 1;
  id: string;
  uid: string;
  requestKey: string;
  problem: string;
  solution: string;
  status: VideoJobStatus;
  progress: number;
  stageLabel: string;
  attempt: number;
  quotaCharged: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  objectPrefix: string;
  manifestObjectKey?: string;
  error?: VideoJobError;
};

export type PublicVideoJob = {
  id: string;
  status: VideoJobStatus;
  progress: number;
  stageLabel: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  error?: VideoJobError;
  quota: {
    used: number;
    limit: number;
    remaining: number;
  };
  lesson?: PlaybackVideoLessonManifest;
};

export type PublicVideoJobSummary = {
  id: string;
  title: string;
  problem: string;
  status: VideoJobStatus;
  progress: number;
  stageLabel: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  posterUrl?: string;
  clipCount?: number;
  durationSeconds?: number;
  error?: VideoJobError;
};

export type PublicVideoQuota = {
  used: number;
  limit: number;
  remaining: number;
};

export type CreateVideoJobInput = {
  requestKey: string;
  problem: string;
  solution: string;
};

export type VideoRenderTaskPayload = {
  schemaVersion: 1;
  uid: string;
  jobId: string;
  attempt: number;
};

export type VideoCleanupTaskPayload = {
  schemaVersion: 1;
  uid: string;
  jobId: string;
};

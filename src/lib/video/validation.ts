import type {
  CreateVideoJobInput,
  StoredVideoLessonManifest,
  VideoJobDocument,
  VideoJobStatus,
  VideoLessonInteraction,
} from "./types.ts";
import { VIDEO_JOB_STATUSES } from "./types.ts";

const MAX_REQUEST_KEY_LENGTH = 240;
const MAX_PROBLEM_LENGTH = 12_000;
const MAX_SOLUTION_LENGTH = 40_000;
const MAX_CLIPS = 8;
const MAX_INTERACTIONS = 8;
const MAX_TEXT_LENGTH = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(
  value: unknown,
  maximum = MAX_TEXT_LENGTH,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function isVideoJobStatus(value: unknown): value is VideoJobStatus {
  return (
    typeof value === "string" &&
    (VIDEO_JOB_STATUSES as readonly string[]).includes(value)
  );
}

function isInteraction(value: unknown): value is VideoLessonInteraction {
  if (!isRecord(value) || !Array.isArray(value.options)) return false;
  if (value.options.length < 2 || value.options.length > 5) return false;

  const optionsAreValid = value.options.every(
    (option) =>
      isRecord(option) &&
      isNonEmptyString(option.id, 100) &&
      isNonEmptyString(option.label, 240),
  );
  if (!optionsAreValid) return false;

  const optionIds = new Set(
    value.options.map((option) => String((option as { id: string }).id)),
  );

  return (
    isNonEmptyString(value.id, 100) &&
    isNonEmptyString(value.afterClip, 100) &&
    isNonEmptyString(value.eyebrow, 160) &&
    (!("problem" in value) ||
      value.problem === undefined ||
      isNonEmptyString(value.problem, 1_000)) &&
    isNonEmptyString(value.prompt, 500) &&
    isNonEmptyString(value.correctOptionId, 100) &&
    optionIds.has(value.correctOptionId) &&
    isNonEmptyString(value.correctFeedback, 600) &&
    isNonEmptyString(value.incorrectFeedback, 600)
  );
}

export function parseCreateVideoJobInput(
  value: unknown,
): CreateVideoJobInput | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.requestKey, MAX_REQUEST_KEY_LENGTH) ||
    !isNonEmptyString(value.problem, MAX_PROBLEM_LENGTH) ||
    !isNonEmptyString(value.solution, MAX_SOLUTION_LENGTH)
  ) {
    return null;
  }

  return {
    requestKey: value.requestKey.trim(),
    problem: value.problem.trim(),
    solution: value.solution.trim(),
  };
}

export function isVideoJobDocument(value: unknown): value is VideoJobDocument {
  if (!isRecord(value)) return false;

  return (
    value.schemaVersion === 1 &&
    isNonEmptyString(value.id, 100) &&
    isNonEmptyString(value.uid, 160) &&
    isNonEmptyString(value.requestKey, MAX_REQUEST_KEY_LENGTH) &&
    isNonEmptyString(value.problem, MAX_PROBLEM_LENGTH) &&
    isNonEmptyString(value.solution, MAX_SOLUTION_LENGTH) &&
    isVideoJobStatus(value.status) &&
    typeof value.progress === "number" &&
    value.progress >= 0 &&
    value.progress <= 100 &&
    isNonEmptyString(value.stageLabel, 240) &&
    typeof value.attempt === "number" &&
    Number.isInteger(value.attempt) &&
    value.attempt >= 1 &&
    typeof value.quotaCharged === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.expiresAt === "number" &&
    isNonEmptyString(value.objectPrefix, 500) &&
    (!("manifestObjectKey" in value) ||
      value.manifestObjectKey === undefined ||
      isNonEmptyString(value.manifestObjectKey, 500)) &&
    (!("error" in value) ||
      value.error === undefined ||
      (isRecord(value.error) &&
        isNonEmptyString(value.error.code, 100) &&
        isNonEmptyString(value.error.message, 500) &&
        typeof value.error.retryable === "boolean"))
  );
}

export function isStoredVideoLessonManifest(
  value: unknown,
): value is StoredVideoLessonManifest {
  if (!isRecord(value) || !Array.isArray(value.clips)) return false;
  if (value.clips.length < 1 || value.clips.length > MAX_CLIPS) return false;
  if (
    !Array.isArray(value.interactions) ||
    value.interactions.length > MAX_INTERACTIONS
  ) {
    return false;
  }

  const clipsAreValid = value.clips.every(
    (clip) =>
      isRecord(clip) &&
      isNonEmptyString(clip.id, 100) &&
      typeof clip.step === "number" &&
      Number.isInteger(clip.step) &&
      clip.step > 0 &&
      isNonEmptyString(clip.title, 240) &&
      typeof clip.durationSeconds === "number" &&
      clip.durationSeconds > 0 &&
      clip.durationSeconds <= 180 &&
      isNonEmptyString(clip.videoObjectKey, 500) &&
      isNonEmptyString(clip.captionsObjectKey, 500) &&
      isNonEmptyString(clip.posterObjectKey, 500),
  );
  if (!clipsAreValid) return false;

  const clipIds = new Set(
    value.clips.map((clip) => String((clip as { id: string }).id)),
  );
  const interactionsAreValid = value.interactions.every(
    (interaction) =>
      isInteraction(interaction) && clipIds.has(interaction.afterClip),
  );
  if (!interactionsAreValid || !isInteraction(value.transferCheck)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    isNonEmptyString(value.lessonId, 100) &&
    isNonEmptyString(value.title, 300) &&
    isNonEmptyString(value.problem, 2_000) &&
    isNonEmptyString(value.learningGoal, 600) &&
    isNonEmptyString(value.disclosure, 300) &&
    clipIds.has(value.transferCheck.afterClip) &&
    isRecord(value.completion) &&
    isNonEmptyString(value.completion.title, 300) &&
    isNonEmptyString(value.completion.body, 600)
  );
}

export function isSafeLessonObjectKey(
  objectKey: string,
  expectedPrefix: string,
): boolean {
  return (
    objectKey.startsWith(expectedPrefix) &&
    !objectKey.includes("..") &&
    !objectKey.includes("\\") &&
    objectKey.length <= 500
  );
}

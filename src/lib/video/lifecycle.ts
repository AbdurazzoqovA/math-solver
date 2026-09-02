import type { VideoJobDocument } from "./types.ts";

export const VIDEO_JOB_RETENTION_MS = 14 * 24 * 60 * 60 * 1_000;
export const MAX_VIDEO_JOB_ATTEMPTS = 20;
const VIDEO_GENERATION_ROOT_PREFIX = "video-lessons/v2/";

type VideoJobObjectIdentity = Pick<
  VideoJobDocument,
  "id" | "uid" | "expiresAt" | "objectPrefix"
>;

export interface VideoAccountDeletionPlan {
  recursivePrefixes: string[];
  directLegacyPrefixes: string[];
}

export function isVideoJobExpired(
  job: Pick<VideoJobDocument, "expiresAt">,
  now = Date.now(),
): boolean {
  return job.expiresAt <= now;
}

export function videoCleanupTaskId(
  jobId: string,
  expiresAt: number,
): string {
  return `cleanup-${jobId}-${Math.trunc(expiresAt)}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
}

export function videoGenerationObjectPrefix(
  uid: string,
  jobId: string,
  expiresAt: number,
): string {
  return `${VIDEO_GENERATION_ROOT_PREFIX}${uid}/${jobId}/${Math.trunc(expiresAt)}/`;
}

export function videoLegacyObjectPrefix(uid: string, jobId: string): string {
  return `video-lessons/${uid}/${jobId}/`;
}

export function isVideoJobObjectPrefix(
  job: VideoJobObjectIdentity,
): boolean {
  return (
    job.objectPrefix === videoLegacyObjectPrefix(job.uid, job.id) ||
    job.objectPrefix ===
      videoGenerationObjectPrefix(job.uid, job.id, job.expiresAt)
  );
}

export function needsLegacyVideoJobObjectFiltering(
  job: VideoJobObjectIdentity,
): boolean {
  return (
    job.uid === "v2" &&
    job.objectPrefix === videoLegacyObjectPrefix(job.uid, job.id)
  );
}

export function isLegacyVideoJobObjectName(relativeName: string): boolean {
  const lessonRelativeName = relativeName.replace(
    /^leases\/[a-f0-9]{32}\//,
    "",
  );
  return (
    lessonRelativeName === "manifest.json" ||
    /^clips\/[^/]+\.mp4$/.test(lessonRelativeName) ||
    /^captions\/[^/]+\.vtt$/.test(lessonRelativeName) ||
    /^posters\/[^/]+\.jpg$/.test(lessonRelativeName)
  );
}

export function videoOwnerObjectPrefixes(uid: string): readonly string[] {
  const legacyPrefix = `video-lessons/${uid}/`;
  const generationPrefix = `${VIDEO_GENERATION_ROOT_PREFIX}${uid}/`;
  const prefixes: string[] = [];
  if (legacyPrefix !== VIDEO_GENERATION_ROOT_PREFIX) {
    prefixes.push(legacyPrefix);
  }
  // A 40-hex UID produces the same parent as the historical UID=v2 job with
  // that job ID. Its generation jobs must be deleted by their exact prefixes.
  if (!/^[a-f0-9]{40}$/.test(uid)) {
    prefixes.push(generationPrefix);
  }
  return prefixes;
}

export function videoAccountDeletionPlan(
  uid: string,
  jobs: readonly VideoJobObjectIdentity[],
): VideoAccountDeletionPlan {
  const recursivePrefixes = new Set(videoOwnerObjectPrefixes(uid));
  const directLegacyPrefixes = new Set<string>();

  for (const job of jobs) {
    if (job.uid !== uid || !isVideoJobObjectPrefix(job)) continue;
    if (
      [...recursivePrefixes].some((prefix) =>
        job.objectPrefix.startsWith(prefix),
      )
    ) {
      continue;
    }

    // A historical user whose literal UID is "v2" owns legacy objects at
    // video-lessons/v2/{jobId}/. Deleting that prefix recursively could also
    // remove generation-scoped objects belonging to a user whose UID happens
    // to equal the job ID. Delete only recognized legacy-layout objects in
    // that case, never arbitrary descendants.
    if (needsLegacyVideoJobObjectFiltering(job)) {
      directLegacyPrefixes.add(job.objectPrefix);
    } else {
      recursivePrefixes.add(job.objectPrefix);
    }
  }

  return {
    recursivePrefixes: [...recursivePrefixes],
    directLegacyPrefixes: [...directLegacyPrefixes],
  };
}

export function canRestartFailedVideoJob(attempt: number): boolean {
  return Number.isInteger(attempt) && attempt < MAX_VIDEO_JOB_ATTEMPTS;
}

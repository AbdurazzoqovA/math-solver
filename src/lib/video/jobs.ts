import "server-only";

import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { VideoJobServiceError } from "@/lib/video/errors";
import type {
  CreateVideoJobInput,
  PublicVideoJob,
  PublicVideoJobSummary,
  PublicVideoQuota,
  VideoJobDocument,
} from "@/lib/video/types";
import { isVideoJobDocument } from "@/lib/video/validation";
import { createPlaybackManifest } from "@/lib/video/storage";

const JOB_RETENTION_MS = 14 * 24 * 60 * 60 * 1_000;
const DEFAULT_FREE_VIDEO_LIMIT = 5;
const MAX_UNSUPPORTED_ATTEMPTS = 2;

type VideoQuota = {
  used: number;
  limit: number;
};

function getFreeVideoLimit(): number {
  const configured = Number(process.env.VIDEO_FREE_LIMIT);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_FREE_VIDEO_LIMIT;
}

function buildJobId(uid: string, requestKey: string): string {
  return createHash("sha256")
    .update(`${uid}\0${requestKey}`)
    .digest("hex")
    .slice(0, 40);
}

function quotaFromData(value: unknown): VideoQuota {
  const limit = getFreeVideoLimit();
  if (!value || typeof value !== "object") return { used: 0, limit };
  const record = value as Record<string, unknown>;
  const used =
    typeof record.used === "number" &&
    Number.isInteger(record.used) &&
    record.used >= 0
      ? record.used
      : 0;
  const storedLimit =
    typeof record.limit === "number" &&
    Number.isInteger(record.limit) &&
    record.limit > 0
      ? record.limit
      : limit;
  return { used, limit: storedLimit };
}

function publicQuota(quota: VideoQuota): PublicVideoQuota {
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: Math.max(0, quota.limit - quota.used),
  };
}

function summarizeProblem(problem: string): string {
  const compact = problem.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 137)}…` : compact;
}

export async function createOrRestartVideoJob(
  uid: string,
  input: CreateVideoJobInput,
): Promise<{
  job: VideoJobDocument;
  shouldEnqueue: boolean;
}> {
  const db = getAdminFirestore();
  const jobId = buildJobId(uid, input.requestKey);
  const jobRef = db.doc(`users/${uid}/videoJobs/${jobId}`);
  const quotaRef = db.doc(`users/${uid}/entitlements/video`);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const [jobSnapshot, quotaSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(quotaRef),
    ]);
    const quota = quotaFromData(quotaSnapshot.data());
    const existingData = jobSnapshot.data();
    const existing = isVideoJobDocument(existingData) ? existingData : null;

    const canRestartUnsupported =
      existing?.status === "unsupported" &&
      existing.attempt < MAX_UNSUPPORTED_ATTEMPTS;
    if (
      existing &&
      existing.status !== "failed" &&
      !canRestartUnsupported
    ) {
      return { job: existing, shouldEnqueue: false };
    }

    const needsQuotaCharge = !existing?.quotaCharged;
    if (needsQuotaCharge && quota.used >= quota.limit) {
      throw new VideoJobServiceError(
        `You have used all ${quota.limit} free video explanations.`,
        402,
        "free_video_limit_reached",
      );
    }

    const attempt = (existing?.attempt ?? 0) + 1;
    const nextJob: VideoJobDocument = {
      schemaVersion: 1,
      id: jobId,
      uid,
      requestKey: input.requestKey,
      problem: input.problem,
      solution: input.solution,
      status: "queued",
      progress: 2,
      stageLabel: "Waiting for the video studio",
      attempt,
      quotaCharged: true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: now + JOB_RETENTION_MS,
      objectPrefix: `video-lessons/${uid}/${jobId}/`,
    };

    transaction.set(jobRef, {
      ...nextJob,
      deleteAt: Timestamp.fromMillis(nextJob.expiresAt),
    });
    if (needsQuotaCharge) {
      transaction.set(
        quotaRef,
        {
          used: quota.used + 1,
          limit: quota.limit,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return { job: nextJob, shouldEnqueue: true };
  });
}

export async function markVideoJobDispatchFailure(
  uid: string,
  jobId: string,
  attempt: number,
): Promise<void> {
  const db = getAdminFirestore();
  const jobRef = db.doc(`users/${uid}/videoJobs/${jobId}`);
  const quotaRef = db.doc(`users/${uid}/entitlements/video`);

  await db.runTransaction(async (transaction) => {
    const [jobSnapshot, quotaSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(quotaRef),
    ]);
    const value = jobSnapshot.data();
    if (!isVideoJobDocument(value) || value.attempt !== attempt) return;

    transaction.update(jobRef, {
      status: "failed",
      progress: 0,
      stageLabel: "The video studio could not start",
      quotaCharged: false,
      updatedAt: Date.now(),
      error: {
        code: "queue_unavailable",
        message:
          "The video studio is temporarily unavailable. Your free lesson was not used.",
        retryable: true,
      },
    });

    const quota = quotaFromData(quotaSnapshot.data());
    transaction.set(
      quotaRef,
      {
        used: Math.max(0, quota.used - 1),
        limit: quota.limit,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  });
}

export async function getVideoJobDocument(
  uid: string,
  jobId: string,
): Promise<VideoJobDocument> {
  if (!/^[a-f0-9]{40}$/.test(jobId)) {
    throw new VideoJobServiceError(
      "The video explanation ID is invalid.",
      400,
      "invalid_job_id",
    );
  }

  const snapshot = await getAdminFirestore()
    .doc(`users/${uid}/videoJobs/${jobId}`)
    .get();
  const value = snapshot.data();
  if (!isVideoJobDocument(value)) {
    throw new VideoJobServiceError(
      "This video explanation was not found.",
      404,
      "job_not_found",
    );
  }
  return value;
}

export async function getPublicVideoJob(
  uid: string,
  jobId: string,
): Promise<PublicVideoJob> {
  const db = getAdminFirestore();
  const [job, quotaSnapshot] = await Promise.all([
    getVideoJobDocument(uid, jobId),
    db.doc(`users/${uid}/entitlements/video`).get(),
  ]);
  const quota = quotaFromData(quotaSnapshot.data());

  const publicJob: PublicVideoJob = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stageLabel: job.stageLabel,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    quota: {
      ...publicQuota(quota),
    },
  };

  if (job.error) {
    publicJob.error =
      job.status === "unsupported" &&
      job.attempt < MAX_UNSUPPORTED_ATTEMPTS
        ? { ...job.error, retryable: true }
        : job.error;
  }
  if (job.status === "ready") {
    if (!job.manifestObjectKey) {
      throw new VideoJobServiceError(
        "The lesson finished without a playback manifest.",
        500,
        "missing_manifest",
      );
    }
    publicJob.lesson = await createPlaybackManifest(job);
  }

  return publicJob;
}

export async function listPublicVideoJobs(uid: string): Promise<{
  jobs: PublicVideoJobSummary[];
  quota: PublicVideoQuota;
}> {
  const db = getAdminFirestore();
  const [jobsSnapshot, quotaSnapshot] = await Promise.all([
    db
      .collection(`users/${uid}/videoJobs`)
      .orderBy("updatedAt", "desc")
      .limit(24)
      .get(),
    db.doc(`users/${uid}/entitlements/video`).get(),
  ]);
  const now = Date.now();
  const storedJobs = jobsSnapshot.docs
    .map((snapshot) => snapshot.data())
    .filter(
      (value): value is VideoJobDocument =>
        isVideoJobDocument(value) && value.expiresAt > now,
    );
  const summaries = await Promise.all(
    storedJobs.map(async (job): Promise<PublicVideoJobSummary> => {
      const summary: PublicVideoJobSummary = {
        id: job.id,
        title: summarizeProblem(job.problem),
        problem: summarizeProblem(job.problem),
        status: job.status,
        progress: job.progress,
        stageLabel: job.stageLabel,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        expiresAt: job.expiresAt,
      };
      if (job.error) summary.error = job.error;
      if (job.status !== "ready") return summary;

      try {
        const { createVideoGalleryMetadata } = await import(
          "@/lib/video/storage"
        );
        return {
          ...summary,
          ...(await createVideoGalleryMetadata(job)),
        };
      } catch (error) {
        console.error("Video library metadata failed:", {
          name: error instanceof Error ? error.name : typeof error,
          jobStatus: job.status,
        });
        return summary;
      }
    }),
  );

  return {
    jobs: summaries,
    quota: publicQuota(quotaFromData(quotaSnapshot.data())),
  };
}

export async function deleteVideoLesson(
  uid: string,
  jobId: string,
): Promise<void> {
  const job = await getVideoJobDocument(uid, jobId);
  const { deleteLessonObjects } = await import("@/lib/video/storage");
  await deleteLessonObjects(job.objectPrefix);
  await getAdminFirestore()
    .doc(`users/${uid}/videoJobs/${jobId}`)
    .delete();
}

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
import {
  canRestartFailedVideoJob,
  isVideoJobExpired,
  MAX_VIDEO_JOB_ATTEMPTS,
  needsLegacyVideoJobObjectFiltering,
  VIDEO_JOB_RETENTION_MS,
  videoGenerationObjectPrefix,
} from "@/lib/video/lifecycle";
import {
  DEFAULT_DAILY_VIDEO_LIMIT,
  normalizeDailyVideoQuota,
  type DailyVideoQuota,
} from "@/lib/video/quota";

const MAX_UNSUPPORTED_ATTEMPTS = 2;

function getFreeVideoLimit(): number {
  return DEFAULT_DAILY_VIDEO_LIMIT;
}

function buildJobId(uid: string, requestKey: string): string {
  return createHash("sha256")
    .update(`${uid}\0${requestKey}`)
    .digest("hex")
    .slice(0, 40);
}

function quotaFromData(value: unknown, now = Date.now()): DailyVideoQuota {
  return normalizeDailyVideoQuota(value, getFreeVideoLimit(), now);
}

function publicQuota(quota: DailyVideoQuota): PublicVideoQuota {
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: Math.max(0, quota.limit - quota.used),
    resetsAt: quota.resetsAt,
  };
}

function summarizeProblem(problem: string): string {
  const compact = problem.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 137)}…` : compact;
}

function accountDeletedError(): VideoJobServiceError {
  return new VideoJobServiceError(
    "This account has been deleted.",
    410,
    "account_deleted",
  );
}

async function assertVideoAccountActive(uid: string): Promise<void> {
  const deletedUser = await getAdminFirestore()
    .doc(`deletedUsers/${uid}`)
    .get();
  if (deletedUser.exists) throw accountDeletedError();
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
  const deletedUserRef = db.doc(`deletedUsers/${uid}`);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const [jobSnapshot, quotaSnapshot, deletedUserSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(quotaRef),
      transaction.get(deletedUserRef),
    ]);
    if (deletedUserSnapshot.exists) {
      throw accountDeletedError();
    }
    const quota = quotaFromData(quotaSnapshot.data(), now);
    const existingData = jobSnapshot.data();
    const storedExisting = isVideoJobDocument(existingData)
      ? existingData
      : null;
    const existing =
      storedExisting && !isVideoJobExpired(storedExisting, now)
        ? storedExisting
        : null;

    const canRestartUnsupported =
      existing?.status === "unsupported" &&
      existing.attempt < MAX_UNSUPPORTED_ATTEMPTS;
    const canRestartFailed =
      existing?.status === "failed" &&
      canRestartFailedVideoJob(existing.attempt);
    if (existing && !canRestartFailed && !canRestartUnsupported) {
      return { job: existing, shouldEnqueue: false };
    }

    const needsQuotaCharge = !existing?.quotaCharged;
    if (needsQuotaCharge && quota.used >= quota.limit) {
      throw new VideoJobServiceError(
        `You have made all ${quota.limit} video explanations available today. You can make more after the daily reset.`,
        429,
        "free_video_limit_reached",
      );
    }

    const attempt = (existing?.attempt ?? 0) + 1;
    const expiresAt = now + VIDEO_JOB_RETENTION_MS;
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
      quotaPeriodKey: quota.periodKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt,
      objectPrefix: videoGenerationObjectPrefix(uid, jobId, expiresAt),
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
          periodKey: quota.periodKey,
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
  const deletedUserRef = db.doc(`deletedUsers/${uid}`);

  await db.runTransaction(async (transaction) => {
    const [jobSnapshot, quotaSnapshot, deletedUserSnapshot] = await Promise.all([
      transaction.get(jobRef),
      transaction.get(quotaRef),
      transaction.get(deletedUserRef),
    ]);
    if (deletedUserSnapshot.exists) return;
    const value = jobSnapshot.data();
    if (!isVideoJobDocument(value) || value.attempt !== attempt) return;

    const now = Date.now();
    transaction.update(jobRef, {
      status: "failed",
      progress: 0,
      stageLabel: "The video studio could not start",
      quotaCharged: false,
      updatedAt: now,
      error: {
        code: "queue_unavailable",
        message:
          "The video studio is temporarily unavailable. Your free lesson was not used.",
        retryable: true,
      },
    });

    const quota = quotaFromData(quotaSnapshot.data(), now);
    const shouldRefund =
      value.quotaCharged && value.quotaPeriodKey === quota.periodKey;
    transaction.set(
      quotaRef,
      {
        used: Math.max(0, quota.used - (shouldRefund ? 1 : 0)),
        limit: quota.limit,
        periodKey: quota.periodKey,
        updatedAt: now,
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
  const [job, quotaSnapshot, deletedUserSnapshot] = await Promise.all([
    getVideoJobDocument(uid, jobId),
    db.doc(`users/${uid}/entitlements/video`).get(),
    db.doc(`deletedUsers/${uid}`).get(),
  ]);
  if (deletedUserSnapshot.exists) throw accountDeletedError();
  const quota = quotaFromData(quotaSnapshot.data());

  if (isVideoJobExpired(job)) {
    throw new VideoJobServiceError(
      "This video explanation was not found.",
      404,
      "job_not_found",
    );
  }

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
    if (
      job.status === "unsupported" &&
      job.attempt < MAX_UNSUPPORTED_ATTEMPTS
    ) {
      publicJob.error = { ...job.error, retryable: true };
    } else if (
      job.status === "failed" &&
      job.attempt >= MAX_VIDEO_JOB_ATTEMPTS
    ) {
      publicJob.error = { ...job.error, retryable: false };
    } else {
      publicJob.error = job.error;
    }
  }
  if (job.status === "ready") {
    if (!job.manifestObjectKey) {
      throw new VideoJobServiceError(
        "The lesson finished without a playback manifest.",
        500,
        "missing_manifest",
      );
    }
    // Keep URL minting behind the tombstone. The second check below prevents
    // URLs minted during a concurrent deletion from being returned.
    await assertVideoAccountActive(uid);
    publicJob.lesson = await createPlaybackManifest(job);
  }

  await assertVideoAccountActive(uid);
  return publicJob;
}

export async function listPublicVideoJobs(uid: string): Promise<{
  jobs: PublicVideoJobSummary[];
  quota: PublicVideoQuota;
}> {
  const db = getAdminFirestore();
  const [jobsSnapshot, quotaSnapshot, deletedUserSnapshot] = await Promise.all([
    db
      .collection(`users/${uid}/videoJobs`)
      .orderBy("updatedAt", "desc")
      .limit(24)
      .get(),
    db.doc(`users/${uid}/entitlements/video`).get(),
    db.doc(`deletedUsers/${uid}`).get(),
  ]);
  if (deletedUserSnapshot.exists) throw accountDeletedError();
  const now = Date.now();
  const storedJobs = jobsSnapshot.docs
    .map((snapshot) => snapshot.data())
    .filter(
      (value): value is VideoJobDocument =>
        isVideoJobDocument(value) && !isVideoJobExpired(value, now),
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
      if (job.error) {
        summary.error =
          job.status === "failed" &&
          job.attempt >= MAX_VIDEO_JOB_ATTEMPTS
            ? { ...job.error, retryable: false }
            : job.error;
      }
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

  // Gallery metadata includes newly signed poster URLs. Do not return either
  // those URLs or private problem summaries if deletion started mid-request.
  await assertVideoAccountActive(uid);
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
  const { deleteLegacyJobLessonObjects, deleteLessonObjects } = await import(
    "@/lib/video/storage"
  );
  if (needsLegacyVideoJobObjectFiltering(job)) {
    await deleteLegacyJobLessonObjects(job.objectPrefix);
  } else {
    await deleteLessonObjects(job.objectPrefix);
  }

  // Remove private media first so a transient storage failure leaves the job
  // available for a safe retry. The generation prefix is immutable, and this
  // conditional delete cannot remove a concurrently recreated generation.
  const db = getAdminFirestore();
  const jobRef = db.doc(`users/${uid}/videoJobs/${jobId}`);
  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(jobRef);
    const current = currentSnapshot.data();
    if (
      isVideoJobDocument(current) &&
      current.objectPrefix === job.objectPrefix &&
      current.expiresAt === job.expiresAt
    ) {
      transaction.delete(jobRef);
    }
  });
}

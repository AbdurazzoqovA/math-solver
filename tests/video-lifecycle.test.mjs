import assert from "node:assert/strict";
import test from "node:test";
import {
  canRestartFailedVideoJob,
  isVideoJobExpired,
  isLegacyVideoJobObjectName,
  MAX_VIDEO_JOB_ATTEMPTS,
  needsLegacyVideoJobObjectFiltering,
  videoAccountDeletionPlan,
  videoCleanupTaskId,
  videoGenerationObjectPrefix,
  videoLegacyObjectPrefix,
  videoOwnerObjectPrefixes,
  VIDEO_JOB_RETENTION_MS,
} from "../src/lib/video/lifecycle.ts";

test("video jobs expire exactly at the retention boundary", () => {
  const createdAt = Date.UTC(2026, 7, 25, 12);
  const expiresAt = createdAt + VIDEO_JOB_RETENTION_MS;
  const job = { expiresAt };

  assert.equal(isVideoJobExpired(job, expiresAt - 1), false);
  assert.equal(isVideoJobExpired(job, expiresAt), true);
});

test("cleanup task names follow the specific retention window", () => {
  const jobId = "a".repeat(40);
  const firstExpiry = Date.UTC(2026, 8, 8, 12);
  const restartedExpiry = Date.UTC(2026, 8, 10, 12);

  assert.equal(
    videoCleanupTaskId(jobId, firstExpiry),
    videoCleanupTaskId(jobId, firstExpiry),
  );
  assert.notEqual(
    videoCleanupTaskId(jobId, firstExpiry),
    videoCleanupTaskId(jobId, restartedExpiry),
  );
});

test("each retention generation receives a disjoint object prefix", () => {
  const uid = "student";
  const jobId = "b".repeat(40);
  const firstExpiry = Date.UTC(2026, 8, 8, 12);
  const restartedExpiry = Date.UTC(2026, 8, 10, 12);

  const first = videoGenerationObjectPrefix(uid, jobId, firstExpiry);
  const restarted = videoGenerationObjectPrefix(uid, jobId, restartedExpiry);

  assert.equal(
    first,
    `video-lessons/v2/${uid}/${jobId}/${firstExpiry}/`,
  );
  assert.notEqual(first, restarted);
  assert.equal(restarted.startsWith(first), false);
  assert.equal(first.startsWith(`video-lessons/${uid}/${jobId}/`), false);
});

test("failed jobs stop before exceeding the renderer attempt contract", () => {
  assert.equal(canRestartFailedVideoJob(MAX_VIDEO_JOB_ATTEMPTS - 1), true);
  assert.equal(canRestartFailedVideoJob(MAX_VIDEO_JOB_ATTEMPTS), false);
  assert.equal(canRestartFailedVideoJob(MAX_VIDEO_JOB_ATTEMPTS + 1), false);
});

test("account deletion covers legacy and generation-scoped media", () => {
  assert.deepEqual(videoOwnerObjectPrefixes("student"), [
    "video-lessons/student/",
    "video-lessons/v2/student/",
  ]);
});

test("the historical v2 UID can never select the generation root", () => {
  const jobId = "c".repeat(40);
  const expiresAt = Date.UTC(2026, 8, 8, 12);
  const plan = videoAccountDeletionPlan("v2", [
    {
      id: jobId,
      uid: "v2",
      expiresAt,
      objectPrefix: videoLegacyObjectPrefix("v2", jobId),
    },
    {
      id: "d".repeat(40),
      uid: "v2",
      expiresAt,
      objectPrefix: videoGenerationObjectPrefix(
        "v2",
        "d".repeat(40),
        expiresAt,
      ),
    },
  ]);

  assert.deepEqual(plan.recursivePrefixes, ["video-lessons/v2/v2/"]);
  assert.deepEqual(plan.directLegacyPrefixes, [
    `video-lessons/v2/${jobId}/`,
  ]);
  assert.equal(
    needsLegacyVideoJobObjectFiltering({
      id: jobId,
      uid: "v2",
      expiresAt,
      objectPrefix: videoLegacyObjectPrefix("v2", jobId),
    }),
    true,
  );
  assert.equal(
    [...plan.recursivePrefixes, ...plan.directLegacyPrefixes].includes(
      "video-lessons/v2/",
    ),
    false,
  );
});

test("special legacy cleanup recognizes media but not nested generations", () => {
  assert.equal(isLegacyVideoJobObjectName("manifest.json"), true);
  assert.equal(
    isLegacyVideoJobObjectName("clips/01-full-lesson.mp4"),
    true,
  );
  assert.equal(
    isLegacyVideoJobObjectName("captions/01-full-lesson.vtt"),
    true,
  );
  assert.equal(
    isLegacyVideoJobObjectName("posters/01-full-lesson.jpg"),
    true,
  );
  assert.equal(
    isLegacyVideoJobObjectName(
      `leases/${"1".repeat(32)}/clips/01-full-lesson.mp4`,
    ),
    true,
  );
  assert.equal(
    isLegacyVideoJobObjectName(`${"e".repeat(40)}/123/leases/file.mp4`),
    false,
  );
});

test("a 40-hex UID cannot recursively select a legacy v2 job parent", () => {
  const uid = "f".repeat(40);
  const jobId = "a".repeat(40);
  const expiresAt = Date.UTC(2026, 8, 8, 12);
  const generationPrefix = videoGenerationObjectPrefix(
    uid,
    jobId,
    expiresAt,
  );
  const plan = videoAccountDeletionPlan(uid, [
    {
      id: jobId,
      uid,
      expiresAt,
      objectPrefix: generationPrefix,
    },
  ]);
  const sharedLegacyParent = `video-lessons/v2/${uid}/`;
  const neighboringLegacyManifest = `${sharedLegacyParent}manifest.json`;

  assert.equal(plan.recursivePrefixes.includes(sharedLegacyParent), false);
  assert.equal(
    plan.recursivePrefixes.some((prefix) =>
      neighboringLegacyManifest.startsWith(prefix),
    ),
    false,
  );
  assert.equal(plan.recursivePrefixes.includes(generationPrefix), true);
});

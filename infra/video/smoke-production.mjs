#!/usr/bin/env node

import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  applicationDefault,
  deleteApp,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firebaseProject =
  process.env.FIREBASE_ADMIN_PROJECT_ID ?? "math-solver-e3a55";
const cloudProject =
  process.env.VIDEO_QUEUE_PROJECT ?? "axial-willow-428621-n4";
const queueLocation = process.env.VIDEO_QUEUE_LOCATION ?? "us-central1";
const queueName = process.env.VIDEO_QUEUE_NAME ?? "video-render";
const storageBucket =
  process.env.VIDEO_STORAGE_BUCKET ??
  "axial-willow-428621-n4-mathsolver-video";
const applicationUrl =
  process.env.VIDEO_SMOKE_APPLICATION_URL ?? "https://math-solver.io";
const useOperatorCleanup =
  process.env.VIDEO_SMOKE_OPERATOR_CLEANUP === "true";
const smokeProblem =
  process.env.VIDEO_SMOKE_PROBLEM ??
  "Solve x + 3 = 7 and explain why the same operation is used on both sides.";
const smokeSolution =
  process.env.VIDEO_SMOKE_SOLUTION ??
  "**Step 1:** Subtract 3 from both sides to preserve equality.\\n\\n**Step 2:** x + 3 - 3 = 7 - 3, so x = 4.\\n\\n**Check:** 4 + 3 = 7.";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const turnstileToken = process.env.VIDEO_SMOKE_TURNSTILE_TOKEN;

if (!apiKey) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_API_KEY is required; run with node --env-file=.env.local.",
  );
}
if (!turnstileToken) {
  throw new Error(
    "VIDEO_SMOKE_TURNSTILE_TOKEN is required. Supply one fresh, single-use token from the production widget.",
  );
}

async function jsonRequest(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function deleteCleanupTask(jobId) {
  const result = spawnSync(
    "gcloud",
    [
      "tasks",
      "delete",
      `cleanup-${jobId}`,
      "--queue",
      queueName,
      "--location",
      queueLocation,
      "--project",
      cloudProject,
      "--quiet",
    ],
    { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] },
  );
  if (result.status !== 0 && !result.stderr.includes("NOT_FOUND")) {
    throw new Error("Could not delete the scheduled smoke-test cleanup task.");
  }
}

async function deleteSmokeLessonWithOperator(uid, jobId) {
  const objectPrefix =
    `gs://${storageBucket}/video-lessons/${uid}/${jobId}/`;
  const result = spawnSync(
    "gcloud",
    ["storage", "rm", "--recursive", objectPrefix],
    { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] },
  );
  await firestore.doc(`users/${uid}/videoJobs/${jobId}`).delete();
  const errorText = result.stderr.toLowerCase();
  const nothingToDelete =
    errorText.includes("matched no objects") ||
    errorText.includes("no urls matched") ||
    errorText.includes("no objects matched");
  if (result.status !== 0 && !nothingToDelete) {
    throw new Error("Could not delete the smoke-test video objects.");
  }
}

process.env.GOOGLE_CLOUD_QUOTA_PROJECT ??= firebaseProject;
const app = initializeApp(
  { credential: applicationDefault(), projectId: firebaseProject },
  `video-production-smoke-${Date.now()}`,
);
const auth = getAuth(app);
const firestore = getFirestore(app);

const email = `video-smoke-${Date.now()}-${randomUUID()}@example.com`;
const password = `${randomBytes(24).toString("base64url")}Aa1!`;
let uid;
let idToken;
let jobId;

try {
  const user = await auth.createUser({
    email,
    password,
    emailVerified: true,
  });
  uid = user.uid;
  console.log("Created a temporary verified smoke-test account.");

  const signIn = await jsonRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );
  if (!signIn.response.ok || typeof signIn.body.idToken !== "string") {
    throw new Error("The temporary verified account could not sign in.");
  }
  idToken = signIn.body.idToken;

  const create = await jsonRequest(`${applicationUrl}/api/video/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestKey: `production-smoke-${randomUUID()}`,
      problem: smokeProblem,
      solution: smokeSolution,
      captchaToken: turnstileToken,
    }),
  });
  if (
    ![200, 202].includes(create.response.status) ||
    typeof create.body?.job?.id !== "string"
  ) {
    throw new Error(
      `The production API did not accept the video job (${create.response.status}).`,
    );
  }
  jobId = create.body.job.id;
  console.log(`Queued the production lesson (${create.body.job.status}).`);

  const deadline = Date.now() + 15 * 60 * 1_000;
  let lastStatus = "";
  let readyJob;
  while (Date.now() < deadline) {
    const status = await jsonRequest(
      `${applicationUrl}/api/video/jobs/${jobId}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!status.response.ok || !status.body?.job) {
      throw new Error(
        `The production job status request failed (${status.response.status}, ${status.body?.code ?? "unknown"}).`,
      );
    }

    const publicJob = status.body.job;
    if (publicJob.status !== lastStatus) {
      console.log(
        `Renderer status: ${publicJob.status} (${publicJob.progress ?? 0}%).`,
      );
      lastStatus = publicJob.status;
    }

    if (publicJob.status === "ready") {
      readyJob = publicJob;
      break;
    }
    if (["failed", "unsupported"].includes(publicJob.status)) {
      throw new Error(
        `The production renderer finished as ${publicJob.status}: ${publicJob.error?.code ?? "unknown"}.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 8_000));
  }

  if (!readyJob?.lesson?.clips?.length) {
    throw new Error("The production lesson did not become ready in 15 minutes.");
  }

  for (const clip of readyJob.lesson.clips) {
    for (const url of [clip.videoUrl, clip.captionsUrl, clip.posterUrl]) {
      const asset = await fetch(url, {
        headers: { Range: "bytes=0-63" },
      });
      if (!asset.ok) {
        throw new Error(`A signed playback asset returned ${asset.status}.`);
      }
      await asset.body?.cancel();
    }
  }

  console.log(
    `Playback verified for ${readyJob.lesson.clips.length} private signed clip sets.`,
  );

  const library = await jsonRequest(`${applicationUrl}/api/video/jobs`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const libraryJob = Array.isArray(library.body?.jobs)
    ? library.body.jobs.find((job) => job?.id === jobId)
    : null;
  if (
    !library.response.ok ||
    !libraryJob ||
    libraryJob.status !== "ready" ||
    typeof libraryJob.posterUrl !== "string"
  ) {
    throw new Error(
      `The video library did not expose the ready lesson (${library.response.status}).`,
    );
  }
  console.log("Video Library verified with a signed private poster.");
} finally {
  const cleanupErrors = [];
  if (idToken && jobId) {
    if (useOperatorCleanup && uid) {
      try {
        await deleteSmokeLessonWithOperator(uid, jobId);
      } catch (error) {
        cleanupErrors.push(error.message);
      }
    } else {
      const response = await fetch(
        `${applicationUrl}/api/video/jobs/${jobId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      if (!response.ok && response.status !== 404) {
        cleanupErrors.push(`lesson cleanup returned ${response.status}`);
      }
    }
    try {
      await deleteCleanupTask(jobId);
    } catch (error) {
      cleanupErrors.push(error.message);
    }
  }
  if (uid) {
    await firestore
      .doc(`users/${uid}/entitlements/video`)
      .delete()
      .catch(() => cleanupErrors.push("quota cleanup failed"));
    await auth
      .deleteUser(uid)
      .catch(() => cleanupErrors.push("account cleanup failed"));
  }
  await deleteApp(app);

  if (cleanupErrors.length > 0) {
    console.error(`Smoke-test cleanup warnings: ${cleanupErrors.join("; ")}`);
  } else if (uid) {
    console.log("Removed the temporary account, job, assets, and cleanup task.");
  }
}

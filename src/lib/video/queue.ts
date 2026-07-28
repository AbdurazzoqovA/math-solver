import "server-only";

import { CloudTasksClient, protos } from "@google-cloud/tasks";
import type {
  VideoCleanupTaskPayload,
  VideoRenderTaskPayload,
} from "@/lib/video/types";

let tasksClient: CloudTasksClient | null = null;

function getTasksClient() {
  tasksClient ??= new CloudTasksClient();
  return tasksClient;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function safeTaskId(jobId: string, attempt: number): string {
  return `video-${jobId}-${attempt}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function cleanupTaskId(jobId: string): string {
  return `cleanup-${jobId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function taskConfiguration() {
  const project =
    process.env.VIDEO_QUEUE_PROJECT ||
    requiredEnvironment("GOOGLE_CLOUD_PROJECT");
  const location = process.env.VIDEO_QUEUE_LOCATION || "us-central1";
  const queue = process.env.VIDEO_QUEUE_NAME || "video-render";
  const rendererUrl = requiredEnvironment("VIDEO_RENDERER_URL");
  const serviceAccountEmail = requiredEnvironment(
    "VIDEO_TASK_SERVICE_ACCOUNT",
  );
  const client = getTasksClient();
  return {
    project,
    location,
    queue,
    rendererUrl,
    serviceAccountEmail,
    client,
    parent: client.queuePath(project, location, queue),
  };
}

async function createIdempotentTask(
  parent: string,
  task: protos.google.cloud.tasks.v2.ITask,
): Promise<void> {
  try {
    await getTasksClient().createTask({ parent, task });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? Number(error.code)
        : null;
    if (code === 6) return;
    throw error;
  }
}

async function enqueueCleanupWithCloudTasks(
  payload: VideoCleanupTaskPayload,
  expiresAt: number,
): Promise<void> {
  const {
    project,
    location,
    queue,
    rendererUrl,
    serviceAccountEmail,
    client,
    parent,
  } = taskConfiguration();
  const task: protos.google.cloud.tasks.v2.ITask = {
    name: client.taskPath(
      project,
      location,
      queue,
      cleanupTaskId(payload.jobId),
    ),
    scheduleTime: { seconds: Math.floor(expiresAt / 1_000) },
    dispatchDeadline: { seconds: 300 },
    httpRequest: {
      httpMethod: "POST",
      url: `${rendererUrl.replace(/\/$/, "")}/cleanup`,
      headers: { "Content-Type": "application/json" },
      oidcToken: { serviceAccountEmail, audience: rendererUrl },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };
  await createIdempotentTask(parent, task);
}

async function enqueueWithCloudTasks(
  payload: VideoRenderTaskPayload,
): Promise<void> {
  const {
    project,
    location,
    queue,
    rendererUrl,
    serviceAccountEmail,
    client,
    parent,
  } = taskConfiguration();
  const taskName = client.taskPath(
    project,
    location,
    queue,
    safeTaskId(payload.jobId, payload.attempt),
  );

  const task: protos.google.cloud.tasks.v2.ITask = {
    name: taskName,
    dispatchDeadline: { seconds: 900 },
    httpRequest: {
      httpMethod: "POST",
      url: `${rendererUrl.replace(/\/$/, "")}/render`,
      headers: {
        "Content-Type": "application/json",
      },
      oidcToken: {
        serviceAccountEmail,
        audience: rendererUrl,
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };

  await createIdempotentTask(parent, task);
}

async function dispatchDirectly(
  payload: VideoRenderTaskPayload,
): Promise<void> {
  const rendererUrl = requiredEnvironment("VIDEO_RENDERER_URL");
  const developmentSecret = requiredEnvironment("VIDEO_DIRECT_RENDER_SECRET");
  const response = await fetch(`${rendererUrl.replace(/\/$/, "")}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Video-Render-Secret": developmentSecret,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Direct renderer dispatch failed (${response.status})`);
  }
}

export async function enqueueVideoRender(
  payload: VideoRenderTaskPayload,
  expiresAt: number,
): Promise<void> {
  const mode =
    process.env.VIDEO_QUEUE_MODE ||
    (process.env.NODE_ENV === "production" ? "cloud-tasks" : "direct");

  if (mode === "cloud-tasks") {
    await enqueueCleanupWithCloudTasks(
      {
        schemaVersion: 1,
        uid: payload.uid,
        jobId: payload.jobId,
      },
      expiresAt,
    );
    await enqueueWithCloudTasks(payload);
    return;
  }
  if (mode === "direct") {
    await dispatchDirectly(payload);
    return;
  }
  throw new Error(`Unsupported VIDEO_QUEUE_MODE: ${mode}`);
}

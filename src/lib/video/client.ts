"use client";

import type {
  CreateVideoJobInput,
  PublicVideoJob,
  PublicVideoJobSummary,
  PublicVideoQuota,
} from "@/lib/video/types";

type VideoJobResponse = {
  job: PublicVideoJob;
};

type VideoJobListResponse = {
  jobs: PublicVideoJobSummary[];
  quota: PublicVideoQuota;
};

export class VideoClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "VideoClientError";
  }
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readError(
  data: unknown,
  fallback: string,
): { message: string; code: string } {
  if (!data || typeof data !== "object") {
    return { message: fallback, code: "video_request_failed" };
  }
  const value = data as Record<string, unknown>;
  return {
    message: typeof value.error === "string" ? value.error : fallback,
    code:
      typeof value.code === "string" ? value.code : "video_request_failed",
  };
}

function readJob(data: unknown): PublicVideoJob {
  if (
    !data ||
    typeof data !== "object" ||
    !("job" in data) ||
    !data.job ||
    typeof data.job !== "object"
  ) {
    throw new VideoClientError(
      "The video studio returned an unreadable response.",
      "invalid_video_response",
      502,
    );
  }
  return (data as VideoJobResponse).job;
}

export async function createVideoJob(
  input: CreateVideoJobInput,
  token: string,
  captchaToken: string | null,
  signal?: AbortSignal,
): Promise<PublicVideoJob> {
  const response = await fetch("/api/video/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...input, captchaToken }),
    cache: "no-store",
    signal,
  });
  const data = await readResponse(response);
  if (!response.ok) {
    const error = readError(
      data,
      "The video explanation could not be started.",
    );
    throw new VideoClientError(error.message, error.code, response.status);
  }
  return readJob(data);
}

export async function listVideoJobs(
  token: string,
  signal?: AbortSignal,
): Promise<VideoJobListResponse> {
  const response = await fetch("/api/video/jobs", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
  const data = await readResponse(response);
  if (!response.ok) {
    const error = readError(
      data,
      "Your video library could not be loaded.",
    );
    throw new VideoClientError(error.message, error.code, response.status);
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("jobs" in data) ||
    !Array.isArray(data.jobs) ||
    !("quota" in data) ||
    !data.quota ||
    typeof data.quota !== "object"
  ) {
    throw new VideoClientError(
      "The video library returned an unreadable response.",
      "invalid_video_library_response",
      502,
    );
  }
  return data as VideoJobListResponse;
}

export async function getVideoJob(
  jobId: string,
  token: string,
  signal?: AbortSignal,
): Promise<PublicVideoJob> {
  const response = await fetch(
    `/api/video/jobs/${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    },
  );
  const data = await readResponse(response);
  if (!response.ok) {
    const error = readError(
      data,
      "The video explanation status could not be loaded.",
    );
    throw new VideoClientError(error.message, error.code, response.status);
  }
  return readJob(data);
}

export async function deleteVideoJob(
  jobId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `/api/video/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok && response.status !== 404) {
    const data = await readResponse(response);
    const error = readError(data, "The lesson could not be deleted.");
    throw new VideoClientError(error.message, error.code, response.status);
  }
}

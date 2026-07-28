import { NextResponse } from "next/server";
import {
  verifyVideoRequest,
  VideoAuthError,
} from "@/lib/firebase-admin";
import { validateRequest } from "@/lib/captcha";
import { VideoJobServiceError } from "@/lib/video/errors";
import {
  createOrRestartVideoJob,
  getPublicVideoJob,
  listPublicVideoJobs,
  markVideoJobDispatchFailure,
} from "@/lib/video/jobs";
import { enqueueVideoRender } from "@/lib/video/queue";
import { parseCreateVideoJobInput } from "@/lib/video/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function safeQueueErrorMetadata(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: typeof error };
  }

  const value = error as {
    name?: unknown;
    code?: unknown;
    details?: unknown;
  };
  return {
    name: typeof value.name === "string" ? value.name : "Error",
    code:
      typeof value.code === "string" || typeof value.code === "number"
        ? value.code
        : undefined,
    details:
      typeof value.details === "string"
        ? value.details.slice(0, 240)
        : undefined,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof VideoAuthError || error instanceof VideoJobServiceError) {
    return noStoreJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error(
    "Video job request failed:",
    error instanceof Error ? error.name : typeof error,
  );
  return noStoreJson(
    {
      error: "The video explanation could not be started. Please try again.",
      code: "video_job_error",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const user = await verifyVideoRequest(request);
    const validation = await validateRequest(request);
    if (!validation.allowed) {
      return noStoreJson(
        { error: validation.error, code: "request_validation_failed" },
        { status: validation.status },
      );
    }

    const input = parseCreateVideoJobInput(validation.body);
    if (!input) {
      return noStoreJson(
        {
          error:
            "A problem, completed solution, and request key are required.",
          code: "invalid_video_request",
        },
        { status: 400 },
      );
    }

    const { job, shouldEnqueue } = await createOrRestartVideoJob(
      user.uid,
      input,
    );

    if (shouldEnqueue) {
      try {
        await enqueueVideoRender(
          {
            schemaVersion: 1,
            uid: user.uid,
            jobId: job.id,
            attempt: job.attempt,
          },
          job.expiresAt,
        );
      } catch (error) {
        console.error("Could not enqueue video render:", {
          ...safeQueueErrorMetadata(error),
          phase: "dispatch",
        });
        await markVideoJobDispatchFailure(user.uid, job.id, job.attempt);
        throw new VideoJobServiceError(
          "The video studio is temporarily unavailable. Your free lesson was not used.",
          503,
          "queue_unavailable",
        );
      }
    }

    const publicJob = await getPublicVideoJob(user.uid, job.id);
    return noStoreJson(
      { job: publicJob },
      { status: shouldEnqueue ? 202 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await verifyVideoRequest(request);
    return noStoreJson(await listPublicVideoJobs(user.uid));
  } catch (error) {
    return errorResponse(error);
  }
}

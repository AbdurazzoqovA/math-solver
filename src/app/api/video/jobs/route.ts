import { NextResponse } from "next/server";
import {
  verifyVideoRequest,
  VideoAuthError,
} from "@/lib/firebase-admin";
import { VideoJobServiceError } from "@/lib/video/errors";
import { handleCreateVideoJob } from "@/lib/video/create-job-handler";
import { listPublicVideoJobs } from "@/lib/video/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
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
  return handleCreateVideoJob(request, "turnstile");
}

export async function GET(request: Request) {
  try {
    const user = await verifyVideoRequest(request);
    return noStoreJson(await listPublicVideoJobs(user.uid));
  } catch (error) {
    return errorResponse(error);
  }
}

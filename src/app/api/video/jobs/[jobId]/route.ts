import { NextResponse } from "next/server";
import {
  verifyVideoRequest,
  VideoAuthError,
} from "@/lib/firebase-admin";
import { VideoJobServiceError } from "@/lib/video/errors";
import {
  deleteVideoLesson,
  getPublicVideoJob,
} from "@/lib/video/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

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
    "Video job lookup failed:",
    error instanceof Error ? error.name : typeof error,
  );
  return noStoreJson(
    {
      error: "The video explanation status could not be loaded.",
      code: "video_job_error",
    },
    { status: 500 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const [user, { jobId }] = await Promise.all([
      verifyVideoRequest(request),
      context.params,
    ]);
    const job = await getPublicVideoJob(user.uid, jobId);
    return noStoreJson({ job });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const [user, { jobId }] = await Promise.all([
      verifyVideoRequest(request),
      context.params,
    ]);
    await deleteVideoLesson(user.uid, jobId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

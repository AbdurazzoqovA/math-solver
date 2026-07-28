import {
  DELETE as handleDeleteVideoJob,
  GET as handleGetVideoJob,
} from "@/app/api/video/jobs/[jobId]/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const failure = await mobileAppCheckFailure(request);
  return failure ?? handleGetVideoJob(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const failure = await mobileAppCheckFailure(request);
  return failure ?? handleDeleteVideoJob(request, context);
}

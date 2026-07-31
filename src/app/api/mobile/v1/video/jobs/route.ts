import { GET as handleListVideoJobs } from "@/app/api/video/jobs/route";
import {
  mobileAppCheckFailure,
  withMobileAppCheck,
} from "@/lib/mobile-request";
import { handleCreateVideoJob } from "@/lib/video/create-job-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobileAppCheck(handleListVideoJobs);

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request, { required: true });
  return failure ?? handleCreateVideoJob(request, "app-check");
}

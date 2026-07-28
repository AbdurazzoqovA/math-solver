import {
  GET as handleListVideoJobs,
  POST as handleCreateVideoJob,
} from "@/app/api/video/jobs/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withMobileAppCheck(handleListVideoJobs);
export const POST = withMobileAppCheck(handleCreateVideoJob);

import { POST as handleCheckWork } from "@/app/api/check-work/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobileAppCheck(handleCheckWork);

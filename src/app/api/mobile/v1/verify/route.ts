import { POST as handleVerify } from "@/app/api/verify/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobileAppCheck(handleVerify);

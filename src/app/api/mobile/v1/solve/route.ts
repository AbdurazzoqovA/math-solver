import { POST as handleSolve } from "@/app/api/solve/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobileAppCheck(handleSolve);

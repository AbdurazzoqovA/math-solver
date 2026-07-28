import { POST as handlePractice } from "@/app/api/practice/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobileAppCheck(handlePractice);

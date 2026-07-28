import { POST as handleOcr } from "@/app/api/ocr/route";
import { withMobileAppCheck } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withMobileAppCheck(handleOcr);

import { POST as handleOcr } from "@/app/api/ocr/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request);
  return failure ??
    handleOcr(request, undefined, { captchaAlreadyVerified: true });
}

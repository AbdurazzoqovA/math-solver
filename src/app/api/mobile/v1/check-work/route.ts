import { POST as handleCheckWork } from "@/app/api/check-work/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request);
  return failure ??
    handleCheckWork(request, undefined, { captchaAlreadyVerified: true });
}

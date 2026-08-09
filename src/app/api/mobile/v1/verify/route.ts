import { POST as handleVerify } from "@/app/api/verify/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request);
  return failure ??
    handleVerify(request, undefined, { captchaAlreadyVerified: true });
}

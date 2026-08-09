import { POST as handlePractice } from "@/app/api/practice/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request);
  return failure ??
    handlePractice(request, undefined, { captchaAlreadyVerified: true });
}

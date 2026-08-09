import { POST as handleSolve } from "@/app/api/solve/route";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const failure = await mobileAppCheckFailure(request);
  return failure ??
    handleSolve(request, undefined, { captchaAlreadyVerified: true });
}

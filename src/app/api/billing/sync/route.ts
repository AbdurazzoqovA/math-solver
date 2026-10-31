import { verifyBillingRequest } from "@/lib/firebase-admin";
import { getPublicPlanStatus } from "@/lib/billing/entitlements";
import { syncCheckoutSession } from "@/lib/billing/events";
import {
  billingErrorResponse,
  noStoreJson,
  readJsonBody,
} from "@/lib/billing/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called from the checkout success page so the plan is visible immediately,
// even before Stripe's webhook has been delivered.
export async function POST(request: Request) {
  try {
    const user = await verifyBillingRequest(request);
    const { sessionId } = await readJsonBody(request);
    if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return noStoreJson(
        { error: "A checkout session is required.", code: "invalid_session" },
        { status: 400 },
      );
    }
    const result = await syncCheckoutSession(user.uid, sessionId);
    return noStoreJson({
      ...result,
      plan: await getPublicPlanStatus(user.uid),
    });
  } catch (error) {
    return billingErrorResponse(
      error,
      "Your purchase could not be confirmed yet. It will appear shortly.",
    );
  }
}

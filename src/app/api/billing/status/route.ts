import { verifyBillingRequest } from "@/lib/firebase-admin";
import { getPublicPlanStatus } from "@/lib/billing/entitlements";
import {
  billingErrorResponse,
  noStoreJson,
} from "@/lib/billing/route-helpers";
import { isStripeConfigured } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await verifyBillingRequest(request);
    return noStoreJson({
      plan: await getPublicPlanStatus(user.uid),
      billingEnabled: isStripeConfigured(),
    });
  } catch (error) {
    return billingErrorResponse(error, "Your plan could not be loaded.");
  }
}

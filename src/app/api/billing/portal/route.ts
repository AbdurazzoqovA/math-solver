import { verifyBillingRequest } from "@/lib/firebase-admin";
import { getStripeCustomerId } from "@/lib/billing/entitlements";
import {
  billingErrorResponse,
  noStoreJson,
} from "@/lib/billing/route-helpers";
import { billingReturnOrigin, getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let uid: string | undefined;
  try {
    const user = await verifyBillingRequest(request);
    uid = user.uid;
    const customerId = await getStripeCustomerId(user.uid);
    if (!customerId) {
      return noStoreJson(
        {
          error: "No subscription is linked to this account yet.",
          code: "no_billing_account",
        },
        { status: 404 },
      );
    }
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${billingReturnOrigin(request)}/pricing`,
      ...(configuration ? { configuration } : {}),
    });
    return noStoreJson({ url: session.url });
  } catch (error) {
    return billingErrorResponse(
      error,
      "The billing portal could not be opened. Please try again.",
      { alert: "portal_failed", uid },
    );
  }
}

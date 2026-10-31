import { verifyBillingRequest } from "@/lib/firebase-admin";
import {
  getPlanEntitlement,
  getStripeCustomerId,
} from "@/lib/billing/entitlements";
import {
  isBillingInterval,
  isPaidPlanTier,
  PLAN_PRICES,
} from "@/lib/billing/plans";
import {
  billingErrorResponse,
  noStoreJson,
  readJsonBody,
} from "@/lib/billing/route-helpers";
import {
  BillingServiceError,
  billingReturnOrigin,
  getStripe,
  resolvePriceId,
} from "@/lib/billing/stripe";
import { effectivePlanTier } from "@/lib/billing/subscription-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let uid: string | undefined;
  let plan: string | undefined;
  try {
    const user = await verifyBillingRequest(request);
    uid = user.uid;
    const { tier, interval } = await readJsonBody(request);
    if (!isPaidPlanTier(tier) || !isBillingInterval(interval)) {
      return noStoreJson(
        { error: "Choose a plan and a billing period.", code: "invalid_plan" },
        { status: 400 },
      );
    }
    plan = `${tier}/${interval}`;

    const [entitlement, customerId] = await Promise.all([
      getPlanEntitlement(user.uid),
      getStripeCustomerId(user.uid),
    ]);
    if (entitlement && effectivePlanTier(entitlement) !== "free") {
      // Plan changes go through the Customer Portal so Stripe prorates them.
      return noStoreJson(
        {
          error: "You already have an active plan. Change it from Manage billing.",
          code: "already_subscribed",
        },
        { status: 409 },
      );
    }

    // Enable only after Stripe Tax is switched on in the Dashboard.
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === "true";
    const origin = billingReturnOrigin(request);
    const priceId = await resolvePriceId(PLAN_PRICES[tier][interval].lookupKey);
    const metadata = { uid: user.uid, tier, interval };
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerId
        ? {
            customer: customerId,
            ...(automaticTax
              ? { customer_update: { address: "auto", name: "auto" } }
              : {}),
          }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.uid,
      metadata,
      subscription_data: { metadata },
      ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });
    if (!session.url) {
      throw new BillingServiceError(
        "Checkout could not be started.",
        502,
        "checkout_unavailable",
      );
    }
    return noStoreJson({ url: session.url });
  } catch (error) {
    return billingErrorResponse(
      error,
      "Checkout could not be started. Please try again.",
      { alert: "checkout_failed", uid, fields: { plan } },
    );
  }
}

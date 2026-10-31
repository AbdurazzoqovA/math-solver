import "server-only";

import type Stripe from "stripe";
import {
  applyPlanEntitlement,
  getPlanEntitlement,
  recordStripeCustomer,
} from "./entitlements.ts";
import { BillingServiceError, getStripe } from "./stripe.ts";
import {
  entitlementFromSubscription,
  subscriptionUid,
  type SubscriptionSnapshot,
} from "./subscription-state.ts";

export type StripeEventResult = {
  handled: boolean;
  applied: boolean;
};

const IGNORED: StripeEventResult = { handled: false, applied: false };

async function applySubscription(
  subscription: SubscriptionSnapshot,
  eventCreated: number,
  fallbackUid: string | null = null,
): Promise<StripeEventResult> {
  const uid = subscriptionUid(subscription) ?? fallbackUid;
  const entitlement = entitlementFromSubscription(subscription, eventCreated);
  if (!uid || !entitlement) {
    // A subscription created outside the app (no uid) or on a price that is
    // not part of the catalog cannot be mapped to an account.
    console.warn("Stripe subscription ignored:", {
      subscription: subscription.id,
      hasUid: Boolean(uid),
      lookupKey: subscription.items.data[0]?.price.lookup_key ?? null,
    });
    return { handled: true, applied: false };
  }
  await recordStripeCustomer(uid, entitlement.stripeCustomerId);
  const applied = await applyPlanEntitlement(uid, entitlement);
  return { handled: true, applied };
}

function sessionUid(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id ?? session.metadata?.uid ?? null;
}

function sessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const value = session.subscription;
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function processStripeEvent(
  event: Stripe.Event,
): Promise<StripeEventResult> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = sessionSubscriptionId(session);
      if (session.mode !== "subscription" || !subscriptionId) return IGNORED;
      const subscription =
        await getStripe().subscriptions.retrieve(subscriptionId);
      return applySubscription(subscription, event.created, sessionUid(session));
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return applySubscription(event.data.object, event.created);
    default:
      return IGNORED;
  }
}

// Success-page fallback: the browser returns before the webhook may have
// arrived (and local development receives no webhooks at all).
export async function syncCheckoutSession(
  uid: string,
  sessionId: string,
): Promise<StripeEventResult> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (sessionUid(session) !== uid) {
    throw new BillingServiceError(
      "This checkout belongs to a different account.",
      403,
      "checkout_mismatch",
    );
  }
  const subscription = session.subscription;
  if (
    session.mode !== "subscription" ||
    !subscription ||
    typeof subscription === "string"
  ) {
    return IGNORED;
  }
  return applySubscription(
    subscription,
    Math.floor(Date.now() / 1_000),
    uid,
  );
}

// Account deletion: stop billing a customer whose account no longer exists.
export async function cancelSubscriptionForDeletedAccount(
  uid: string,
): Promise<void> {
  try {
    const entitlement = await getPlanEntitlement(uid);
    if (
      !entitlement ||
      entitlement.status === "canceled" ||
      entitlement.status === "incomplete_expired"
    ) {
      return;
    }
    await getStripe().subscriptions.cancel(entitlement.stripeSubscriptionId, {
      cancellation_details: { comment: "Account deleted by the user." },
    });
  } catch (error) {
    console.error("Stripe cancellation after account deletion failed:", {
      name: error instanceof Error ? error.name : typeof error,
    });
  }
}

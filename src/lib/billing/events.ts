import "server-only";

import type Stripe from "stripe";
import { describePlan, formatAmount, sendBillingAlert } from "./alerts.ts";
import {
  applyPlanEntitlement,
  getPlanEntitlement,
  recordStripeCustomer,
} from "./entitlements.ts";
import { BillingServiceError, getStripe } from "./stripe.ts";
import {
  effectivePlanTier,
  entitlementFromSubscription,
  subscriptionCustomerId,
  subscriptionUid,
  type SubscriptionSnapshot,
} from "./subscription-state.ts";

export type StripeEventResult = {
  handled: boolean;
  applied: boolean;
};

const IGNORED: StripeEventResult = { handled: false, applied: false };

// Subscription states in which Stripe is, or will be, charging the customer.
const BILLABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

function lookupKeyOf(subscription: SubscriptionSnapshot): string | null {
  return subscription.items.data[0]?.price.lookup_key ?? null;
}

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
      lookupKey: lookupKeyOf(subscription),
    });
    if (BILLABLE_STATUSES.has(subscription.status)) {
      await sendBillingAlert("subscription_unmatched", {
        subscription: subscription.id,
        customer: subscriptionCustomerId(subscription),
        plan: describePlan(lookupKeyOf(subscription)),
        status: subscription.status,
        reason: uid
          ? "price is not in the catalog"
          : "no account id on the subscription",
      });
    }
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
      const uid = sessionUid(session) ?? subscriptionUid(subscription);
      const result = await applySubscription(subscription, event.created, uid);
      // The success page may already have applied this subscription, so report
      // the account's current plan rather than whether this event changed it.
      const current = uid ? await getPlanEntitlement(uid) : null;
      await sendBillingAlert("payment_succeeded", {
        plan: describePlan(lookupKeyOf(subscription)),
        amount: formatAmount(session.amount_total, session.currency),
        email: session.customer_details?.email ?? null,
        user: uid ?? "no account",
        subscription: subscription.id,
        "plan active": current && effectivePlanTier(current) !== "free" ? "yes" : "NO",
      });
      return result;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return applySubscription(event.data.object, event.created);
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const result = await applySubscription(subscription, event.created);
      await sendBillingAlert("subscription_cancelled", {
        plan: describePlan(lookupKeyOf(subscription)),
        user: subscriptionUid(subscription) ?? "no account",
        customer: subscriptionCustomerId(subscription),
        subscription: subscription.id,
      });
      return result;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await sendBillingAlert("renewal_failed", {
        customer:
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer?.id ?? null),
        email: invoice.customer_email ?? null,
        amount: formatAmount(invoice.amount_due, invoice.currency),
        attempt: invoice.attempt_count,
        "next attempt": invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1_000).toISOString().slice(0, 10)
          : "none; Stripe has stopped retrying",
        invoice: invoice.id,
      });
      return { handled: true, applied: false };
    }
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

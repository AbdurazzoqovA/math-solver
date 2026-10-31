// Pure subscription-state logic: how a Stripe subscription becomes a stored
// entitlement, which stored entitlement wins, and what the client may see.
// No Stripe SDK or Firestore imports so Node tests can exercise every branch.

import {
  PLAN_LIMITS,
  planFromLookupKey,
  type BillingInterval,
  type PaidPlanTier,
  type PlanLimits,
  type PlanTier,
} from "./plans.ts";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

const SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

// Access continues while Stripe retries a failed renewal, but not forever.
export const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1_000;
const ENTITLED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "trialing",
  "active",
  "past_due",
]);

export type PlanEntitlementDocument = {
  schemaVersion: 1;
  tier: PaidPlanTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  priceLookupKey: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
  // Stripe event.created (seconds). Webhooks can arrive out of order.
  eventCreated: number;
  updatedAt: number;
};

export type PublicPlanStatus = {
  tier: PlanTier;
  status: SubscriptionStatus | "none";
  interval: BillingInterval | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
  canManageBilling: boolean;
  limits: PlanLimits;
};

// The subset of a Stripe subscription this module reads. Recent API versions
// keep the billing period on each item; older ones kept it on the subscription.
export type SubscriptionSnapshot = {
  id: string;
  status: string;
  customer: string | { id: string };
  cancel_at_period_end: boolean;
  trial_end: number | null;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  items: {
    data: Array<{
      current_period_end?: number | null;
      price: { lookup_key: string | null };
    }>;
  };
};

function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === "string" && SUBSCRIPTION_STATUSES.has(value);
}

function optionalMillis(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readPlanEntitlement(
  value: unknown,
): PlanEntitlementDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const plan = planFromLookupKey(record.priceLookupKey);
  if (
    record.schemaVersion !== 1 ||
    !plan ||
    record.tier !== plan.tier ||
    record.interval !== plan.interval ||
    !isSubscriptionStatus(record.status) ||
    typeof record.stripeCustomerId !== "string" ||
    typeof record.stripeSubscriptionId !== "string" ||
    typeof record.eventCreated !== "number" ||
    typeof record.updatedAt !== "number"
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    tier: plan.tier,
    status: record.status,
    interval: plan.interval,
    priceLookupKey: plan.tier + "_" + plan.interval,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    currentPeriodEnd: optionalMillis(record.currentPeriodEnd),
    cancelAtPeriodEnd: record.cancelAtPeriodEnd === true,
    trialEnd: optionalMillis(record.trialEnd),
    eventCreated: record.eventCreated,
    updatedAt: record.updatedAt,
  };
}

function isEntitled(
  entitlement: PlanEntitlementDocument,
  now: number,
): boolean {
  if (!ENTITLED_STATUSES.has(entitlement.status)) return false;
  if (
    entitlement.status === "past_due" &&
    entitlement.currentPeriodEnd !== null &&
    now > entitlement.currentPeriodEnd + PAST_DUE_GRACE_MS
  ) {
    return false;
  }
  return true;
}

export function effectivePlanTier(value: unknown, now = Date.now()): PlanTier {
  const entitlement = readPlanEntitlement(value);
  if (!entitlement || !isEntitled(entitlement, now)) return "free";
  return entitlement.tier;
}

export function dailyVideoLimitForPlan(
  value: unknown,
  now = Date.now(),
): number {
  return PLAN_LIMITS[effectivePlanTier(value, now)].dailyVideos;
}

export function subscriptionCustomerId(
  subscription: SubscriptionSnapshot,
): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

export function subscriptionUid(
  subscription: SubscriptionSnapshot,
): string | null {
  const uid = subscription.metadata?.uid;
  return typeof uid === "string" && uid.length > 0 ? uid : null;
}

export function entitlementFromSubscription(
  subscription: SubscriptionSnapshot,
  eventCreated: number,
  now = Date.now(),
): PlanEntitlementDocument | null {
  const item = subscription.items.data[0];
  const plan = planFromLookupKey(item?.price.lookup_key);
  if (!item || !plan || !isSubscriptionStatus(subscription.status)) {
    return null;
  }
  const periodEndSeconds =
    item.current_period_end ?? subscription.current_period_end ?? null;
  return {
    schemaVersion: 1,
    tier: plan.tier,
    status: subscription.status,
    interval: plan.interval,
    priceLookupKey: plan.tier + "_" + plan.interval,
    stripeCustomerId: subscriptionCustomerId(subscription),
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd:
      typeof periodEndSeconds === "number" ? periodEndSeconds * 1_000 : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    trialEnd:
      typeof subscription.trial_end === "number"
        ? subscription.trial_end * 1_000
        : null,
    eventCreated,
    updatedAt: now,
  };
}

// Out-of-order webhooks must not downgrade a newer state, and an ended
// subscription must not hide a newer active one.
export function shouldApplyEntitlement(
  existing: unknown,
  incoming: PlanEntitlementDocument,
  now = Date.now(),
): boolean {
  const current = readPlanEntitlement(existing);
  if (!current) return true;
  if (current.stripeSubscriptionId !== incoming.stripeSubscriptionId) {
    const currentEntitled = isEntitled(current, now);
    const incomingEntitled = isEntitled(incoming, now);
    if (currentEntitled !== incomingEntitled) return incomingEntitled;
  }
  return incoming.eventCreated >= current.eventCreated;
}

export function publicPlanStatus(
  value: unknown,
  now = Date.now(),
): PublicPlanStatus {
  const entitlement = readPlanEntitlement(value);
  const tier = effectivePlanTier(value, now);
  return {
    tier,
    status: entitlement?.status ?? "none",
    interval: tier === "free" ? null : (entitlement?.interval ?? null),
    currentPeriodEnd: entitlement?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: entitlement?.cancelAtPeriodEnd ?? false,
    trialEnd: tier === "free" ? null : (entitlement?.trialEnd ?? null),
    canManageBilling: Boolean(entitlement?.stripeCustomerId),
    limits: PLAN_LIMITS[tier],
  };
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  PLAN_LIMITS,
  formatUsd,
  monthlyEquivalentCents,
  planFeatures,
  planFromLookupKey,
  yearlySavingsPercent,
} from "../src/lib/billing/plans.ts";
import {
  PAST_DUE_GRACE_MS,
  dailyVideoLimitForPlan,
  effectivePlanTier,
  entitlementFromSubscription,
  publicPlanStatus,
  readPlanEntitlement,
  shouldApplyEntitlement,
} from "../src/lib/billing/subscription-state.ts";

const NOW = Date.UTC(2026, 9, 31, 12);
const NOW_SECONDS = Math.floor(NOW / 1_000);

function subscription(overrides = {}) {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    cancel_at_period_end: false,
    trial_end: null,
    metadata: { uid: "user-1" },
    items: {
      data: [
        {
          current_period_end: NOW_SECONDS + 30 * 24 * 3600,
          price: { lookup_key: "plus_month" },
        },
      ],
    },
    ...overrides,
  };
}

test("catalog prices, lookup keys, and student-facing math stay consistent", () => {
  assert.deepEqual(planFromLookupKey("plus_month"), { tier: "plus", interval: "month" });
  assert.deepEqual(planFromLookupKey("unlimited_year"), { tier: "unlimited", interval: "year" });
  assert.equal(planFromLookupKey("premium_month"), null);
  assert.equal(planFromLookupKey("plus_week"), null);
  assert.equal(planFromLookupKey(undefined), null);
  assert.equal(monthlyEquivalentCents("plus", "year"), 250);
  assert.equal(monthlyEquivalentCents("unlimited", "year"), 500);
  assert.equal(monthlyEquivalentCents("plus", "month"), 499);
  assert.equal(yearlySavingsPercent("plus"), 50);
  assert.equal(yearlySavingsPercent("unlimited"), 50);
  assert.equal(formatUsd(250), "$2.50");
  assert.equal(formatUsd(5999), "$59.99");
  assert.equal(formatUsd(0), "$0.00");
  assert.deepEqual(PLAN_LIMITS.free, { dailyVideos: 2, dailyScans: 5, dailyQuizzes: 1 });
  assert.match(planFeatures("free").join("\n"), /2 a day/);
  assert.match(planFeatures("unlimited").join("\n"), /30 a day/);
});

test("a Stripe subscription becomes a stored entitlement", () => {
  const entitlement = entitlementFromSubscription(
    subscription({ status: "trialing", trial_end: NOW_SECONDS + 7 * 24 * 3600, cancel_at_period_end: true }),
    NOW_SECONDS,
    NOW,
  );
  assert.deepEqual(entitlement, {
    schemaVersion: 1,
    tier: "plus",
    status: "trialing",
    interval: "month",
    priceLookupKey: "plus_month",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    currentPeriodEnd: (NOW_SECONDS + 30 * 24 * 3600) * 1_000,
    cancelAtPeriodEnd: true,
    trialEnd: (NOW_SECONDS + 7 * 24 * 3600) * 1_000,
    eventCreated: NOW_SECONDS,
    updatedAt: NOW,
  });
  assert.equal(readPlanEntitlement(entitlement)?.tier, "plus");
});

test("subscriptions on unknown prices, expanded customers, and legacy period fields are handled", () => {
  assert.equal(
    entitlementFromSubscription(
      subscription({ items: { data: [{ price: { lookup_key: "legacy_pro" } }] } }),
      NOW_SECONDS,
    ),
    null,
  );
  const legacy = entitlementFromSubscription(
    subscription({
      customer: { id: "cus_expanded" },
      current_period_end: NOW_SECONDS + 10,
      items: { data: [{ price: { lookup_key: "unlimited_year" } }] },
    }),
    NOW_SECONDS,
    NOW,
  );
  assert.equal(legacy?.stripeCustomerId, "cus_expanded");
  assert.equal(legacy?.currentPeriodEnd, (NOW_SECONDS + 10) * 1_000);
  assert.equal(legacy?.tier, "unlimited");
});

test("effective tier follows subscription status with a bounded past-due grace", () => {
  const active = entitlementFromSubscription(subscription(), NOW_SECONDS, NOW);
  assert.equal(effectivePlanTier(active, NOW), "plus");
  assert.equal(dailyVideoLimitForPlan(active, NOW), 10);
  assert.equal(dailyVideoLimitForPlan(undefined, NOW), 2);
  assert.equal(effectivePlanTier({ tier: "unlimited" }, NOW), "free");

  const canceled = entitlementFromSubscription(subscription({ status: "canceled" }), NOW_SECONDS, NOW);
  assert.equal(effectivePlanTier(canceled, NOW), "free");

  const periodEnd = NOW_SECONDS - 24 * 3600;
  const pastDue = entitlementFromSubscription(
    subscription({ status: "past_due", items: { data: [{ current_period_end: periodEnd, price: { lookup_key: "plus_month" } }] } }),
    NOW_SECONDS,
    NOW,
  );
  assert.equal(effectivePlanTier(pastDue, NOW), "plus");
  assert.equal(effectivePlanTier(pastDue, periodEnd * 1_000 + PAST_DUE_GRACE_MS + 1), "free");
});

test("out-of-order and overlapping subscription events resolve safely", () => {
  const older = entitlementFromSubscription(subscription(), NOW_SECONDS - 60, NOW);
  const newer = entitlementFromSubscription(subscription({ cancel_at_period_end: true }), NOW_SECONDS, NOW);
  assert.equal(shouldApplyEntitlement(undefined, older, NOW), true);
  assert.equal(shouldApplyEntitlement(older, newer, NOW), true);
  assert.equal(shouldApplyEntitlement(newer, older, NOW), false);

  const endedOld = entitlementFromSubscription(subscription({ id: "sub_old", status: "canceled" }), NOW_SECONDS + 5, NOW);
  const newActive = entitlementFromSubscription(subscription({ id: "sub_new" }), NOW_SECONDS, NOW);
  assert.equal(shouldApplyEntitlement(endedOld, newActive, NOW), true, "a live subscription replaces an ended one");
  assert.equal(shouldApplyEntitlement(newActive, endedOld, NOW), false, "an ended subscription never hides a live one");
});

test("public plan status never exposes Stripe identifiers", () => {
  const entitlement = entitlementFromSubscription(subscription({ cancel_at_period_end: true }), NOW_SECONDS, NOW);
  const status = publicPlanStatus(entitlement, NOW);
  assert.deepEqual(Object.keys(status).sort(), [
    "canManageBilling",
    "cancelAtPeriodEnd",
    "currentPeriodEnd",
    "interval",
    "limits",
    "status",
    "tier",
    "trialEnd",
  ]);
  assert.equal(status.tier, "plus");
  assert.equal(status.cancelAtPeriodEnd, true);
  assert.equal(status.limits.dailyVideos, 10);
  assert.deepEqual(publicPlanStatus(undefined, NOW), {
    tier: "free",
    status: "none",
    interval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    canManageBilling: false,
    limits: PLAN_LIMITS.free,
  });
});

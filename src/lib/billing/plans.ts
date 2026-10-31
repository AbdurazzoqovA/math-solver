// Shared plan catalog for the web app, API routes, scripts, and tests. It has
// no server-only or framework imports so every runtime can load it.

export type PlanTier = "free" | "plus" | "unlimited";
export type PaidPlanTier = Exclude<PlanTier, "free">;
export type BillingInterval = "month" | "year";
export type PriceLookupKey = `${PaidPlanTier}_${BillingInterval}`;

export const PAID_PLAN_TIERS: readonly PaidPlanTier[] = ["plus", "unlimited"];
export const BILLING_INTERVALS: readonly BillingInterval[] = ["month", "year"];
export const BILLING_CURRENCY = "usd";

// null means unlimited.
export type PlanLimits = {
  dailyVideos: number;
  dailyScans: number | null;
  dailyQuizzes: number | null;
};

// Typed step-by-step solving stays unlimited and free on every tier. Paid
// tiers remove the scan and quiz caps and raise the costly video allowance.
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { dailyVideos: 2, dailyScans: 5, dailyQuizzes: 1 },
  plus: { dailyVideos: 10, dailyScans: null, dailyQuizzes: null },
  unlimited: { dailyVideos: 30, dailyScans: null, dailyQuizzes: null },
};

export const PLAN_TAGLINES: Record<PlanTier, string> = {
  free: "Everything you need to get unstuck",
  plus: "For students who study every week",
  unlimited: "For exam season and heavy weeks",
};

export function planFeatures(tier: PlanTier): string[] {
  const limits = PLAN_LIMITS[tier];
  if (tier === "free") {
    return [
      "Unlimited step-by-step solutions",
      "Explain any step, similar problems",
      `Photo, PDF & drawing scans · ${limits.dailyScans} a day`,
      `Practice quiz · ${limits.dailyQuizzes} a day`,
      `Video lessons · ${limits.dailyVideos} a day`,
    ];
  }
  if (tier === "plus") {
    return [
      "Everything in Free",
      "Unlimited photo, PDF & drawing scans",
      "Unlimited practice quizzes & mistake review",
      `Video lessons · ${limits.dailyVideos} a day`,
    ];
  }
  return [
    "Everything in Plus",
    `Video lessons · ${limits.dailyVideos} a day (fair use)`,
    "Early access to new features",
    "Priority support",
  ];
}

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  plus: "Plus",
  unlimited: "Unlimited",
};

export type PlanPrice = {
  amountCents: number;
  lookupKey: PriceLookupKey;
};

export const PLAN_PRICES: Record<
  PaidPlanTier,
  Record<BillingInterval, PlanPrice>
> = {
  plus: {
    month: { amountCents: 499, lookupKey: "plus_month" },
    year: { amountCents: 2999, lookupKey: "plus_year" },
  },
  unlimited: {
    month: { amountCents: 999, lookupKey: "unlimited_month" },
    year: { amountCents: 5999, lookupKey: "unlimited_year" },
  },
};

export function isPaidPlanTier(value: unknown): value is PaidPlanTier {
  return value === "plus" || value === "unlimited";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

export function planFromLookupKey(
  lookupKey: unknown,
): { tier: PaidPlanTier; interval: BillingInterval } | null {
  if (typeof lookupKey !== "string") return null;
  const separator = lookupKey.lastIndexOf("_");
  if (separator === -1) return null;
  const tier = lookupKey.slice(0, separator);
  const interval = lookupKey.slice(separator + 1);
  if (!isPaidPlanTier(tier) || !isBillingInterval(interval)) return null;
  return PLAN_PRICES[tier][interval].lookupKey === lookupKey
    ? { tier, interval }
    : null;
}

export function monthlyEquivalentCents(
  tier: PaidPlanTier,
  interval: BillingInterval,
): number {
  const amount = PLAN_PRICES[tier][interval].amountCents;
  return interval === "year" ? Math.round(amount / 12) : amount;
}

export function yearlySavingsPercent(tier: PaidPlanTier): number {
  const monthlyTotal = PLAN_PRICES[tier].month.amountCents * 12;
  const yearly = PLAN_PRICES[tier].year.amountCents;
  return Math.round((1 - yearly / monthlyTotal) * 100);
}

export function formatUsd(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = Math.abs(cents % 100);
  return `$${dollars}.${String(remainder).padStart(2, "0")}`;
}

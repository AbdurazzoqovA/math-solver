// Client-safe contract for daily usage limits shared by API routes, the chat
// components, and the limit toast. No server imports.

import type { PlanLimits, PlanTier } from "./plans.ts";

export type MeteredFeature = "scans" | "quizzes";
export const DAILY_LIMIT_CODE = "daily_limit_reached";
export const USAGE_LIMIT_EVENT = "mathsolver:usage-limit";

export type UsageLimitDetail = {
  feature: MeteredFeature;
  limit: number;
  resetsAt: number;
  tier: PlanTier;
};

export function planLimitFor(
  limits: PlanLimits,
  feature: MeteredFeature,
): number | null {
  return feature === "scans" ? limits.dailyScans : limits.dailyQuizzes;
}

// Parses a 429 body from /api/ocr or /api/practice; null for other errors.
export function readUsageLimitError(
  status: number,
  data: unknown,
): UsageLimitDetail | null {
  if (status !== 429 || !data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (
    value.code !== DAILY_LIMIT_CODE ||
    (value.feature !== "scans" && value.feature !== "quizzes") ||
    typeof value.limit !== "number" ||
    typeof value.resetsAt !== "number"
  ) {
    return null;
  }
  return {
    feature: value.feature,
    limit: value.limit,
    resetsAt: value.resetsAt,
    tier:
      value.tier === "plus" || value.tier === "unlimited" ? value.tier : "free",
  };
}

export function announceUsageLimit(detail: UsageLimitDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USAGE_LIMIT_EVENT, { detail }));
}

export class UsageLimitReachedError extends Error {
  readonly detail: UsageLimitDetail;

  constructor(detail: UsageLimitDetail) {
    super(`Daily ${detail.feature} limit reached`);
    this.name = "UsageLimitReachedError";
    this.detail = detail;
  }
}

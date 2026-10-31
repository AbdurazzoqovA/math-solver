"use client";

import type { BillingInterval, PaidPlanTier } from "./plans.ts";
import type { PublicPlanStatus } from "./subscription-state.ts";

export class BillingClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "BillingClientError";
    this.code = code;
    this.status = status;
  }
}

async function billingRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const value = (data ?? {}) as Record<string, unknown>;
    throw new BillingClientError(
      typeof value.error === "string"
        ? value.error
        : "The billing service is unavailable. Please try again.",
      typeof value.code === "string" ? value.code : "billing_request_failed",
      response.status,
    );
  }
  return data as T;
}

export type PlanStatusResponse = {
  plan: PublicPlanStatus;
  billingEnabled: boolean;
};

export function fetchPlanStatus(token: string): Promise<PlanStatusResponse> {
  return billingRequest<PlanStatusResponse>("/api/billing/status", token);
}

export function createCheckoutSession(
  token: string,
  tier: PaidPlanTier,
  interval: BillingInterval,
): Promise<{ url: string }> {
  return billingRequest<{ url: string }>("/api/billing/checkout", token, {
    method: "POST",
    body: JSON.stringify({ tier, interval }),
  });
}

export function createPortalSession(token: string): Promise<{ url: string }> {
  return billingRequest<{ url: string }>("/api/billing/portal", token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function confirmCheckoutSession(
  token: string,
  sessionId: string,
): Promise<{ plan: PublicPlanStatus; applied: boolean }> {
  return billingRequest<{ plan: PublicPlanStatus; applied: boolean }>(
    "/api/billing/sync",
    token,
    { method: "POST", body: JSON.stringify({ sessionId }) },
  );
}

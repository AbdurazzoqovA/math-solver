import "server-only";

import Stripe from "stripe";
import {
  formatOwnerAlert,
  isOwnerAlertConfigured,
  resetOwnerAlertThrottle,
  sendOwnerAlert,
  type OwnerAlertFields,
} from "../owner-alerts.ts";
import { PLAN_NAMES, planFromLookupKey } from "./plans.ts";

// Owner notifications for billing incidents and payments; delivery goes
// through the shared Telegram transport in owner-alerts.ts.

export type BillingAlertKind =
  | "checkout_failed"
  | "portal_failed"
  | "sync_failed"
  | "webhook_failed"
  | "webhook_signature_invalid"
  | "subscription_unmatched"
  | "renewal_failed"
  | "payment_succeeded"
  | "subscription_cancelled";

export type BillingAlertFields = OwnerAlertFields;

const TITLES: Record<BillingAlertKind, string> = {
  checkout_failed: "🚨 Checkout failed: the user could not open Stripe Checkout",
  portal_failed: "🚨 Billing portal failed: the user could not manage their plan",
  sync_failed: "🚨 Purchase confirmation failed after checkout",
  webhook_failed: "🚨 Webhook processing failed: a paid plan may not be active",
  webhook_signature_invalid:
    "🚨 Webhook signature rejected: check STRIPE_WEBHOOK_SECRET",
  subscription_unmatched:
    "🚨 Paid subscription has no account: plan not activated",
  renewal_failed: "⚠️ Renewal payment failed",
  payment_succeeded: "✅ Payment received",
  subscription_cancelled: "ℹ️ Subscription ended",
};

// Bots probing the webhook would otherwise page the owner for every request.
const THROTTLE_MS: Partial<Record<BillingAlertKind, number>> = {
  webhook_signature_invalid: 15 * 60 * 1_000,
};
const MAX_FIELD_LENGTH = 300;

export const resetBillingAlertThrottle = resetOwnerAlertThrottle;
export const isBillingAlertConfigured = isOwnerAlertConfigured;

export function describeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    const detail = [error.type, error.code, error.statusCode]
      .filter((part) => part !== undefined && part !== null && part !== "")
      .join(" ");
    return `${detail}: ${error.message}`.slice(0, MAX_FIELD_LENGTH);
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, MAX_FIELD_LENGTH);
  }
  return typeof error;
}

export function describePlan(lookupKey: string | null | undefined): string {
  const plan = planFromLookupKey(lookupKey);
  if (!plan) return lookupKey ?? "unknown plan";
  return `${PLAN_NAMES[plan.tier]} ${plan.interval === "year" ? "yearly" : "monthly"}`;
}

export function formatAmount(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function formatBillingAlert(
  kind: BillingAlertKind,
  fields: BillingAlertFields,
  now: Date = new Date(),
): string {
  return formatOwnerAlert(TITLES[kind], fields, now);
}

// Resolves to true only when Telegram accepted the message. Never throws.
export function sendBillingAlert(
  kind: BillingAlertKind,
  fields: BillingAlertFields = {},
): Promise<boolean> {
  return sendOwnerAlert({
    key: kind,
    title: TITLES[kind],
    fields,
    throttleMs: THROTTLE_MS[kind],
  });
}

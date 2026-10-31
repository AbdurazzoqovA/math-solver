import "server-only";

import Stripe from "stripe";
import { PLAN_NAMES, planFromLookupKey } from "./plans.ts";

// Owner notifications for billing incidents and payments, delivered to a
// private Telegram chat. Sending never throws, is bounded by a short timeout,
// and never logs the bot token or chat id.

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

export type BillingAlertFields = Record<
  string,
  string | number | boolean | null | undefined
>;

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
const TIMEOUT_MS = 5_000;
const MAX_FIELD_LENGTH = 300;

type ThrottleEntry = { lastSent: number; suppressed: number };
const alertGlobals = globalThis as typeof globalThis & {
  __mathsolverBillingAlertThrottle?: Map<BillingAlertKind, ThrottleEntry>;
};
function throttle(): Map<BillingAlertKind, ThrottleEntry> {
  return (alertGlobals.__mathsolverBillingAlertThrottle ??= new Map());
}

export function resetBillingAlertThrottle(): void {
  throttle().clear();
}

export function isBillingAlertConfigured(): boolean {
  return Boolean(
    process.env.BILLING_TELEGRAM_BOT_TOKEN &&
      process.env.BILLING_TELEGRAM_CHAT_ID,
  );
}

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
  const lines = [TITLES[kind]];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${key}: ${String(value).slice(0, MAX_FIELD_LENGTH)}`);
  }
  lines.push(
    `MathSolver · ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`,
  );
  return lines.join("\n");
}

// Resolves to true only when Telegram accepted the message. Never throws.
export async function sendBillingAlert(
  kind: BillingAlertKind,
  fields: BillingAlertFields = {},
): Promise<boolean> {
  const token = process.env.BILLING_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.BILLING_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const windowMs = THROTTLE_MS[kind];
  let note: string | null = null;
  if (windowMs) {
    const now = Date.now();
    const entry = throttle().get(kind);
    if (entry && now - entry.lastSent < windowMs) {
      entry.suppressed += 1;
      return false;
    }
    if (entry?.suppressed) {
      note = `${entry.suppressed} similar alert(s) suppressed in the last ${Math.round(windowMs / 60_000)} min`;
    }
    throttle().set(kind, { lastSent: now, suppressed: 0 });
  }

  const text = formatBillingAlert(kind, note ? { ...fields, note } : fields);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { ok?: unknown }
      | null;
    if (!response.ok || result?.ok !== true) {
      console.error("Billing alert delivery failed:", {
        kind,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Billing alert delivery failed:", {
      kind,
      name: error instanceof Error ? error.name : typeof error,
    });
    return false;
  }
}

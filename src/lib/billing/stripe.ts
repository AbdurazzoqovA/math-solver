import "server-only";

import Stripe from "stripe";
import { SITE_URL } from "@/lib/i18n/paths";
import type { PriceLookupKey } from "./plans.ts";

// Written without TypeScript parameter properties so Node's strip-only
// test runner can load this module directly.
export class BillingServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "BillingServiceError";
    this.status = status;
    this.code = code;
  }
}

const globalStripe = globalThis as typeof globalThis & {
  __mathsolverStripe?: Stripe;
  __mathsolverStripePrices?: Map<PriceLookupKey, string>;
};

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new BillingServiceError(
      "Payments are not available yet.",
      503,
      "billing_not_configured",
    );
  }
  if (!globalStripe.__mathsolverStripe) {
    globalStripe.__mathsolverStripe = new Stripe(secretKey, {
      appInfo: { name: "MathSolver", url: SITE_URL },
      maxNetworkRetries: 2,
    });
  }
  return globalStripe.__mathsolverStripe;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new BillingServiceError(
      "Webhook verification is not configured.",
      503,
      "webhook_not_configured",
    );
  }
  return secret;
}

// Prices are created by scripts/stripe-setup.mjs with stable lookup keys, so
// the app needs no per-price environment variables.
export async function resolvePriceId(
  lookupKey: PriceLookupKey,
): Promise<string> {
  const cache = (globalStripe.__mathsolverStripePrices ??= new Map());
  const cached = cache.get(lookupKey);
  if (cached) return cached;

  const prices = await getStripe().prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new BillingServiceError(
      "This plan is not available right now.",
      503,
      "price_not_found",
    );
  }
  cache.set(lookupKey, price.id);
  return price.id;
}

// Checkout and portal return URLs: production always returns to the canonical
// site; development may return to the local origin that made the request.
export function billingReturnOrigin(request: Request): string {
  if (process.env.NODE_ENV === "production") return SITE_URL;
  const origin = request.headers.get("origin");
  if (!origin) return SITE_URL;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
  } catch {
    // Fall through to the canonical site.
  }
  return SITE_URL;
}

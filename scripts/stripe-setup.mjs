#!/usr/bin/env node
// Idempotently creates the MathSolver products, recurring prices (found again
// by lookup key), and a Customer Portal configuration in the Stripe account
// that STRIPE_SECRET_KEY belongs to. Safe to re-run; it changes nothing that
// already matches the catalog in src/lib/billing/plans.ts.
//
//   node scripts/stripe-setup.mjs            # sandbox/test key from ignored .env
//   node scripts/stripe-setup.mjs --live     # required before touching a live key
//   node scripts/stripe-setup.mjs --webhook [url]
//       also registers the billing webhook endpoint (default
//       https://math-solver.io/api/billing/webhook) and prints its signing
//       secret once, at creation. Stripe never shows it again.
import Stripe from "stripe";
import {
  BILLING_CURRENCY,
  BILLING_INTERVALS,
  PAID_PLAN_TIERS,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_PRICES,
} from "../src/lib/billing/plans.ts";

const SITE_URL = "https://math-solver.io";
const TIER_METADATA_KEY = "mathsolver_tier";
const PORTAL_METADATA = { mathsolver: "customer-portal" };
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

for (const file of [".env.development.local", ".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Optional file.
  }
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
if (!secretKey.startsWith("sk_test_") && !process.argv.includes("--live")) {
  console.error("Refusing to modify a live Stripe account without --live.");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { appInfo: { name: "MathSolver setup" } });

const DESCRIPTIONS = {
  plus: `Unlimited photo and drawing OCR, unlimited practice quizzes and mistake review, ${PLAN_LIMITS.plus.dailyVideos} video lessons a day, and cross-device notebook sync.`,
  unlimited: `Everything in Plus with ${PLAN_LIMITS.unlimited.dailyVideos} video lessons a day (fair use), video downloads, longer video retention, and early access to new features.`,
};

async function ensureProduct(tier) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find(
    (product) => product.metadata?.[TIER_METADATA_KEY] === tier,
  );
  if (existing) return { product: existing, created: false };
  const product = await stripe.products.create({
    name: `MathSolver ${PLAN_NAMES[tier]}`,
    description: DESCRIPTIONS[tier],
    metadata: { [TIER_METADATA_KEY]: tier },
  });
  return { product, created: true };
}

async function ensurePrice(product, tier, interval) {
  const { amountCents, lookupKey } = PLAN_PRICES[tier][interval];
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const existing = prices.data[0];
  if (
    existing &&
    existing.active &&
    existing.product === product.id &&
    existing.currency === BILLING_CURRENCY &&
    existing.unit_amount === amountCents &&
    existing.recurring?.interval === interval
  ) {
    return { price: existing, created: false };
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: BILLING_CURRENCY,
    unit_amount: amountCents,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    nickname: `${PLAN_NAMES[tier]} ${interval === "year" ? "yearly" : "monthly"}`,
    metadata: { [TIER_METADATA_KEY]: tier },
  });
  if (existing && existing.active) {
    await stripe.prices.update(existing.id, { active: false });
  }
  return { price, created: true };
}

async function ensurePortalConfiguration(catalog) {
  const configurations = await stripe.billingPortal.configurations.list({ limit: 100 });
  const existing = configurations.data.find(
    (configuration) =>
      configuration.active &&
      configuration.metadata?.mathsolver === PORTAL_METADATA.mathsolver,
  );
  const products = catalog.map(({ product, prices }) => ({
    product: product.id,
    prices: prices.map((price) => price.id),
  }));
  const features = {
    customer_update: { enabled: true, allowed_updates: ["email", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      cancellation_reason: {
        enabled: true,
        options: ["too_expensive", "missing_features", "unused", "switched_service", "other"],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products,
    },
  };
  const businessProfile = {
    headline: "Manage your MathSolver plan",
    privacy_policy_url: `${SITE_URL}/privacy`,
    terms_of_service_url: `${SITE_URL}/terms`,
  };
  if (existing) {
    const configuration = await stripe.billingPortal.configurations.update(existing.id, {
      business_profile: businessProfile,
      features,
      default_return_url: `${SITE_URL}/pricing`,
    });
    return { configuration, created: false };
  }
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: businessProfile,
    features,
    default_return_url: `${SITE_URL}/pricing`,
    metadata: PORTAL_METADATA,
  });
  return { configuration, created: true };
}

const catalog = [];
for (const tier of PAID_PLAN_TIERS) {
  const { product, created } = await ensureProduct(tier);
  console.log(`${created ? "created" : "kept   "} product ${product.id}  ${product.name}`);
  const prices = [];
  for (const interval of BILLING_INTERVALS) {
    const result = await ensurePrice(product, tier, interval);
    prices.push(result.price);
    console.log(
      `${result.created ? "created" : "kept   "} price   ${result.price.id}  ${result.price.lookup_key}  ${(result.price.unit_amount / 100).toFixed(2)} ${result.price.currency}/${interval}`,
    );
  }
  catalog.push({ product, prices });
}

const portal = await ensurePortalConfiguration(catalog);
console.log(`${portal.created ? "created" : "updated"} portal  ${portal.configuration.id}`);

async function ensureWebhookEndpoint(url) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((endpoint) => endpoint.url === url);
  if (existing) {
    const missing = WEBHOOK_EVENTS.filter((event) => !existing.enabled_events.includes(event));
    if (missing.length > 0 || existing.status !== "enabled") {
      await stripe.webhookEndpoints.update(existing.id, {
        enabled_events: WEBHOOK_EVENTS,
        disabled: false,
      });
    }
    return { endpoint: existing, created: false };
  }
  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: WEBHOOK_EVENTS,
    description: "MathSolver billing (subscriptions and checkout)",
  });
  return { endpoint, created: true };
}

const webhookFlag = process.argv.indexOf("--webhook");
if (webhookFlag !== -1) {
  const next = process.argv[webhookFlag + 1];
  const url = next && !next.startsWith("--") ? next : `${SITE_URL}/api/billing/webhook`;
  const { endpoint, created } = await ensureWebhookEndpoint(url);
  console.log(`${created ? "created" : "kept   "} webhook ${endpoint.id}  ${url}  (${endpoint.status})`);
  if (created) {
    console.log("");
    console.log("Store this signing secret as STRIPE_WEBHOOK_SECRET now; Stripe shows it only once:");
    console.log(endpoint.secret);
  } else {
    console.log("Signing secret unchanged; roll it from the Dashboard if it was lost.");
  }
}
console.log("");
console.log("Add to the environment (ignored .env locally, deployment secrets in production):");
console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${portal.configuration.id}`);
console.log("");
if (webhookFlag === -1) {
  console.log("Webhook endpoint: re-run with --webhook [url] to register");
  console.log(`  ${SITE_URL}/api/billing/webhook`);
  console.log(`  events: ${WEBHOOK_EVENTS.join(", ")}`);
  console.log("and store the printed signing secret as STRIPE_WEBHOOK_SECRET.");
}

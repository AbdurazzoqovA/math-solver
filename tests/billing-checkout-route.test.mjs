import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

// Exercise the checkout and status route handlers at their auth/plan/Stripe
// boundaries. No network, credentials, or Firestore are used.
const fixture = { user: null, plan: null, customerId: null, sessions: [] };
globalThis.__mathsolverBillingRouteTest = fixture;
const dataModule = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const local = (path) => ({ url: new URL(`../src/lib/${path}`, import.meta.url).href, shortCircuit: true });
const stripeMock = dataModule(`
  export class BillingServiceError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  export function isStripeConfigured() { return true; }
  export function billingReturnOrigin() { return "https://math-solver.io"; }
  export async function resolvePriceId(key) { return "price_" + key; }
  export function getStripe() {
    const f = globalThis.__mathsolverBillingRouteTest;
    return { checkout: { sessions: { create: async (params) => { f.sessions.push(params); return { url: "https://checkout.stripe.test/session" }; } } } };
  }
`);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return dataModule("export {};");
    if (specifier === "next/server") return dataModule('export const NextResponse = { json: (body, init) => Response.json(body, init) };');
    if (specifier === "@/lib/firebase-admin") return dataModule(`
      export class VideoAuthError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
      export async function verifyBillingRequest() { const f = globalThis.__mathsolverBillingRouteTest; if (!f.user) throw new VideoAuthError("Sign in to continue to checkout.", 401, "authentication_required"); return f.user; }
    `);
    if (specifier === "@/lib/billing/entitlements") return dataModule(`
      const f = () => globalThis.__mathsolverBillingRouteTest;
      export async function getPlanEntitlement() { return f().plan; }
      export async function getStripeCustomerId() { return f().customerId; }
      export async function getPublicPlanStatus() { return { tier: f().plan ? f().plan.tier : "free" }; }
    `);
    if (specifier === "@/lib/billing/stripe" || ((specifier === "./stripe" || specifier === "./stripe.ts") && context.parentURL?.includes("/lib/billing/"))) return stripeMock;
    if (specifier.startsWith("@/lib/")) return local(specifier.slice("@/lib/".length) + ".ts");
    return nextResolve(specifier, context);
  },
});
const { POST: checkout } = await import("../src/app/api/billing/checkout/route.ts");
const { GET: status } = await import("../src/app/api/billing/status/route.ts");

const post = (body) => new Request("https://math-solver.io/api/billing/checkout", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://math-solver.io" },
  body: JSON.stringify(body),
});
const verifiedUser = { uid: "user-1", email: "student@example.com", email_verified: true };

test("checkout requires a verified account", async () => {
  Object.assign(fixture, { user: null, plan: null, customerId: null, sessions: [] });
  const response = await checkout(post({ tier: "plus", interval: "year" }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "authentication_required");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("checkout rejects plans outside the catalog", async () => {
  Object.assign(fixture, { user: verifiedUser, plan: null, customerId: null, sessions: [] });
  for (const body of [{ tier: "pro", interval: "year" }, { tier: "plus", interval: "week" }, {}]) {
    const response = await checkout(post(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_plan");
  }
  assert.equal(fixture.sessions.length, 0);
});

test("checkout creates a yearly session tied to the account", async () => {
  Object.assign(fixture, { user: verifiedUser, plan: null, customerId: null, sessions: [] });
  const response = await checkout(post({ tier: "plus", interval: "year" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { url: "https://checkout.stripe.test/session" });
  const [params] = fixture.sessions;
  assert.equal(params.mode, "subscription");
  assert.deepEqual(params.line_items, [{ price: "price_plus_year", quantity: 1 }]);
  assert.equal(params.customer_email, "student@example.com");
  assert.equal(params.customer, undefined);
  assert.equal(params.client_reference_id, "user-1");
  assert.deepEqual(params.metadata, { uid: "user-1", tier: "plus", interval: "year" });
  assert.deepEqual(params.subscription_data, { metadata: params.metadata }, "no trial period is ever offered");
  assert.equal(params.allow_promotion_codes, true);
  assert.match(params.success_url, /^https:\/\/math-solver\.io\/pricing\?checkout=success&session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.equal(params.cancel_url, "https://math-solver.io/pricing?checkout=cancelled");
});

test("monthly checkout reuses a known Stripe customer", async () => {
  Object.assign(fixture, { user: verifiedUser, plan: null, customerId: "cus_existing", sessions: [] });
  const response = await checkout(post({ tier: "unlimited", interval: "month" }));
  assert.equal(response.status, 200);
  const [params] = fixture.sessions;
  assert.equal(params.customer, "cus_existing");
  assert.equal(params.customer_email, undefined);
  assert.deepEqual(params.line_items, [{ price: "price_unlimited_month", quantity: 1 }]);
  assert.equal(params.subscription_data.trial_period_days, undefined);
});

test("an active subscriber is sent to the billing portal instead of a second checkout", async () => {
  const activePlan = {
    schemaVersion: 1, tier: "plus", status: "active", interval: "month", priceLookupKey: "plus_month",
    stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", currentPeriodEnd: Date.now() + 86_400_000,
    cancelAtPeriodEnd: false, trialEnd: null, eventCreated: 1, updatedAt: Date.now(),
  };
  Object.assign(fixture, { user: verifiedUser, plan: activePlan, customerId: "cus_1", sessions: [] });
  const response = await checkout(post({ tier: "unlimited", interval: "year" }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "already_subscribed");
  assert.equal(fixture.sessions.length, 0);

  const canceledPlan = { ...activePlan, status: "canceled" };
  Object.assign(fixture, { plan: canceledPlan, sessions: [] });
  assert.equal((await checkout(post({ tier: "plus", interval: "year" }))).status, 200, "a canceled subscriber can buy again");
  assert.equal(fixture.sessions[0].subscription_data.trial_period_days, undefined);
});

test("a known Stripe customer without a plan document is reused at checkout", async () => {
  Object.assign(fixture, { user: verifiedUser, plan: null, customerId: "cus_returning", sessions: [] });
  assert.equal((await checkout(post({ tier: "plus", interval: "year" }))).status, 200);
  assert.equal(fixture.sessions[0].customer, "cus_returning");
  assert.equal(fixture.sessions[0].subscription_data.trial_period_days, undefined);
  assert.equal(fixture.sessions[0].automatic_tax, undefined);
});

test("status requires auth and reports the plan", async () => {
  Object.assign(fixture, { user: null });
  assert.equal((await status(new Request("https://math-solver.io/api/billing/status"))).status, 401);
  Object.assign(fixture, { user: verifiedUser, plan: null });
  const response = await status(new Request("https://math-solver.io/api/billing/status"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { plan: { tier: "free" }, billingEnabled: true });
});

import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createFakeFirestore } from "./helpers/fake-firestore.mjs";

// Local sandbox of the whole chain: Stripe event → entitlement document →
// plan tier → video allowance and scan/quiz limits → real OCR/practice route
// handlers. Stripe's network and Firestore are replaced by in-process fakes;
// everything else is the production code.
process.env.GUEST_USAGE_SECRET = "integration-test-secret";
const fixture = {
  db: createFakeFirestore(),
  tokens: { "tok-free": "u-free", "tok-paid": "u-paid" },
  subscriptions: {},
  sessions: {},
  cancelled: [],
  ocrText: "x^2 + 2x + 1 = 0",
};
globalThis.__mathsolverIntegration = fixture;
const dataModule = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const local = (path) => ({ url: new URL(`../src/lib/${path}`, import.meta.url).href, shortCircuit: true });
const stripeMock = dataModule(`
  const f = () => globalThis.__mathsolverIntegration;
  export class BillingServiceError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  export function isStripeConfigured() { return true; }
  export function getStripeWebhookSecret() { return "whsec_test"; }
  export function billingReturnOrigin() { return "https://math-solver.io"; }
  export async function resolvePriceId(key) { return "price_" + key; }
  export function getStripe() {
    return {
      subscriptions: {
        retrieve: async (id) => { const s = f().subscriptions[id]; if (!s) throw new Error("no sub " + id); return s; },
        cancel: async (id) => { f().cancelled.push(id); return { id, status: "canceled" }; },
      },
      checkout: { sessions: { retrieve: async (id) => f().sessions[id] } },
    };
  }
`);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return dataModule("export {};");
    if (specifier === "next/server") return dataModule('export const NextResponse = { json: (body, init) => Response.json(body, init) };');
    if (specifier === "@/lib/firebase-admin") return dataModule(`
      const f = () => globalThis.__mathsolverIntegration;
      export class VideoAuthError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
      export function getAdminFirestore() { return f().db; }
      export function getAdminAuth() { return { verifyIdToken: async (token) => { const uid = f().tokens[token]; if (!uid) throw new Error("invalid token"); return { uid, email_verified: true }; } }; }
    `);
    if (specifier === "@/lib/captcha") return dataModule('export async function validateRequest(req) { const body = await req.json(); const { captchaToken, ...rest } = body; return { allowed: true, ip: "127.0.0.1", body: rest }; }');
    if (specifier === "@/lib/llm") return dataModule('export function getLLMProvider() { return "gemini"; } export async function generateText() { return globalThis.__mathsolverIntegration.ocrText; }');
    if (specifier === "@/lib/llm-image") return dataModule("export async function prepareLLMImage(data, mimeType) { return { data, mimeType }; }");
    if (specifier === "@/lib/billing/stripe" || ((specifier === "./stripe" || specifier === "./stripe.ts") && context.parentURL?.includes("/lib/billing/"))) return stripeMock;
    if (specifier.startsWith("@/lib/")) return local(specifier.slice("@/lib/".length) + ".ts");
    return nextResolve(specifier, context);
  },
});

const { processStripeEvent, syncCheckoutSession, cancelSubscriptionForDeletedAccount } = await import("../src/lib/billing/events.ts");
const { getPublicPlanStatus } = await import("../src/lib/billing/entitlements.ts");
const { checkUsage, recordUsage, parseGuestUsageCookie, usageLimitBody } = await import("../src/lib/billing/usage.ts");
const { dailyVideoLimitForPlan } = await import("../src/lib/billing/subscription-state.ts");
const { POST: ocr } = await import("../src/app/api/ocr/route.ts");
const { POST: practice } = await import("../src/app/api/practice/route.ts");

const NOW = Date.UTC(2026, 9, 31, 12);
const NOW_SECONDS = Math.floor(NOW / 1_000);
const subscription = (id, overrides = {}) => ({
  id,
  status: "active",
  customer: "cus_A",
  cancel_at_period_end: false,
  trial_end: null,
  metadata: { uid: "u-paid", tier: "plus", interval: "month" },
  items: { data: [{ current_period_end: NOW_SECONDS + 30 * 24 * 3600, price: { lookup_key: "plus_month" } }] },
  ...overrides,
});
const event = (type, object, created) => ({ id: `evt_${created}`, type, created, data: { object } });
const request = (headers = {}) => new Request("https://math-solver.io/api/test", { headers });
const planDoc = (uid) => fixture.db.read(`users/${uid}/entitlements/plan`);

test("checkout completion unlocks the plan, raises the video allowance, and removes scan limits", async () => {
  fixture.subscriptions.sub_A = subscription("sub_A");
  const result = await processStripeEvent(event("checkout.session.completed", {
    mode: "subscription", subscription: "sub_A", client_reference_id: "u-paid", customer: "cus_A", metadata: { uid: "u-paid" },
  }, NOW_SECONDS));
  assert.deepEqual(result, { handled: true, applied: true });
  assert.equal(planDoc("u-paid").tier, "plus");
  assert.equal(fixture.db.read("users/u-paid/entitlements/billing").stripeCustomerId, "cus_A");
  const status = await getPublicPlanStatus("u-paid");
  assert.equal(status.tier, "plus");
  assert.equal(status.canManageBilling, true);
  assert.equal(dailyVideoLimitForPlan(planDoc("u-paid"), NOW), 10);

  const check = await checkUsage(request({ authorization: "Bearer tok-paid" }), "scans", { now: NOW });
  assert.equal(check.tier, "plus");
  assert.equal(check.limit, null);
  assert.equal(check.allowed, true);
  await recordUsage(check);
  assert.equal(fixture.db.read("users/u-paid/entitlements/usage"), undefined, "unlimited tiers write no usage");
});

test("a free account is metered in Firestore and resets at the next UTC day", async () => {
  for (let i = 0; i < 5; i += 1) {
    const check = await checkUsage(request({ authorization: "Bearer tok-free" }), "scans", { now: NOW });
    assert.equal(check.allowed, true, `scan ${i + 1} allowed`);
    assert.equal(check.used, i);
    await recordUsage(check);
  }
  const denied = await checkUsage(request({ authorization: "Bearer tok-free" }), "scans", { now: NOW });
  assert.equal(denied.allowed, false);
  assert.deepEqual(usageLimitBody(denied), {
    error: "You have used today's 5 free scans. Typing the problem is always free, and more scans unlock after the daily reset.",
    code: "daily_limit_reached", feature: "scans", limit: 5, used: 5, resetsAt: Date.UTC(2026, 10, 1), tier: "free",
  });

  const quiz = await checkUsage(request({ authorization: "Bearer tok-free" }), "quizzes", { now: NOW });
  assert.equal(quiz.allowed, true);
  await recordUsage(quiz);
  assert.equal((await checkUsage(request({ authorization: "Bearer tok-free" }), "quizzes", { now: NOW })).allowed, false);
  assert.deepEqual(fixture.db.read("users/u-free/entitlements/usage").scans, 5);

  const tomorrow = await checkUsage(request({ authorization: "Bearer tok-free" }), "scans", { now: NOW + 24 * 3600 * 1_000 });
  assert.equal(tomorrow.used, 0);
  assert.equal(tomorrow.allowed, true);
});

test("web guests are metered through a signed cookie; tampering and other days reset it", async () => {
  let cookie = null;
  for (let i = 0; i < 5; i += 1) {
    const check = await checkUsage(request(cookie ? { cookie } : {}), "scans", { now: NOW });
    assert.equal(check.identity.kind, "guest");
    assert.equal(check.allowed, true);
    assert.equal(check.used, i);
    const { setCookie } = await recordUsage(check);
    assert.match(setCookie, /^ms_usage=.+; Path=\/; Max-Age=172800; HttpOnly; SameSite=Lax$/);
    cookie = setCookie.split(";")[0];
  }
  assert.equal((await checkUsage(request({ cookie }), "scans", { now: NOW })).allowed, false);
  assert.deepEqual(parseGuestUsageCookie(cookie), { d: "2026-10-31", s: 5, q: 0 });
  assert.equal(parseGuestUsageCookie(cookie.replace("ms_usage=", "ms_usage=A")), null);
  assert.equal(parseGuestUsageCookie(`${cookie}x`), null);
  assert.equal((await checkUsage(request({ cookie }), "scans", { now: NOW + 24 * 3600 * 1_000 })).used, 0);
  assert.equal((await checkUsage(request({ cookie }), "quizzes", { now: NOW })).allowed, true, "quiz counter is separate");

  const stale = await checkUsage(request({ authorization: "Bearer tok-expired", cookie }), "scans", { now: NOW });
  assert.equal(stale.identity.kind, "guest", "an invalid session falls back to guest metering");
  assert.equal(stale.allowed, false);

  const mobile = await checkUsage(request({}), "scans", { guestCookies: false, now: NOW });
  assert.equal(mobile.identity.kind, "anonymous");
  assert.equal(mobile.allowed, true);
  assert.equal((await recordUsage(mobile)).setCookie, null);
});

test("the real OCR and practice routes enforce the allowance and set the cookie", async () => {
  const post = (path, body, cookie) => new Request(`https://math-solver.io${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  let cookie = null;
  for (let i = 0; i < 5; i += 1) {
    const response = await ocr(post("/api/ocr", { base64: Buffer.from("img").toString("base64"), mimeType: "image/png" }, cookie));
    assert.equal(response.status, 200, `scan ${i + 1}`);
    assert.deepEqual(await response.json(), { text: fixture.ocrText });
    cookie = response.headers.get("set-cookie").split(";")[0];
  }
  const blocked = await ocr(post("/api/ocr", { base64: Buffer.from("img").toString("base64"), mimeType: "image/png" }, cookie));
  assert.equal(blocked.status, 429);
  const body = await blocked.json();
  assert.equal(body.code, "daily_limit_reached");
  assert.equal(body.feature, "scans");
  assert.equal(body.limit, 5);
  assert.equal(blocked.headers.get("cache-control"), "private, no-store");

  fixture.ocrText = JSON.stringify({ title: "Quadratics", questions: Array.from({ length: 4 }, (_, i) => ({ question: `q${i}`, options: ["a", "b", "c", "d"], correctAnswerIndex: 0 })) });
  const quiz = await practice(post("/api/practice", { topic: "x^2" }, cookie));
  assert.equal(quiz.status, 200);
  assert.equal((await quiz.json()).questions.length, 4);
  cookie = quiz.headers.get("set-cookie").split(";")[0];
  assert.deepEqual(parseGuestUsageCookie(cookie), { d: new Date().toISOString().slice(0, 10), s: 5, q: 1 });
  const secondQuiz = await practice(post("/api/practice", { topic: "x^2" }, cookie));
  assert.equal(secondQuiz.status, 429);
  assert.equal((await secondQuiz.json()).feature, "quizzes");

  const unreadable = await ocr(post("/api/ocr", { base64: Buffer.from("img").toString("base64"), mimeType: "image/png" }));
  fixture.ocrText = "";
  const failed = await ocr(post("/api/ocr", { base64: Buffer.from("img").toString("base64"), mimeType: "image/png" }));
  assert.equal(unreadable.status, 200);
  assert.equal(failed.status, 422);
  assert.equal(failed.headers.get("set-cookie"), null, "a failed scan costs nothing");
  fixture.ocrText = "x^2";
});

test("later subscription events win, stale ones are ignored, and cancellation returns the account to free", async () => {
  const flagged = await processStripeEvent(event("customer.subscription.updated", subscription("sub_A", { cancel_at_period_end: true }), NOW_SECONDS + 10));
  assert.equal(flagged.applied, true);
  assert.equal(planDoc("u-paid").cancelAtPeriodEnd, true);
  assert.equal((await getPublicPlanStatus("u-paid")).tier, "plus");

  const stale = await processStripeEvent(event("customer.subscription.updated", subscription("sub_A", { status: "canceled" }), NOW_SECONDS - 10));
  assert.equal(stale.applied, false);
  assert.equal((await getPublicPlanStatus("u-paid")).tier, "plus");

  const ended = await processStripeEvent(event("customer.subscription.deleted", subscription("sub_A", { status: "canceled" }), NOW_SECONDS + 20));
  assert.equal(ended.applied, true);
  const status = await getPublicPlanStatus("u-paid");
  assert.equal(status.tier, "free");
  assert.equal(status.status, "canceled");
  assert.equal(status.canManageBilling, true, "the customer stays linked for the portal and re-subscription");
  assert.equal(dailyVideoLimitForPlan(planDoc("u-paid"), NOW), 2);
  const check = await checkUsage(request({ authorization: "Bearer tok-paid" }), "scans", { now: NOW });
  assert.equal(check.limit, 5);
});

test("the success-page sync is account-bound and a fresh subscription replaces an ended one", async () => {
  fixture.sessions.cs_1 = { mode: "subscription", client_reference_id: "u-paid", metadata: { uid: "u-paid" }, subscription: subscription("sub_B", { customer: "cus_A" }) };
  await assert.rejects(() => syncCheckoutSession("u-other", "cs_1"), (error) => error.code === "checkout_mismatch" && error.status === 403);
  const synced = await syncCheckoutSession("u-paid", "cs_1");
  assert.equal(synced.applied, true);
  assert.equal(planDoc("u-paid").stripeSubscriptionId, "sub_B");
  assert.equal((await getPublicPlanStatus("u-paid")).tier, "plus");

  const ignored = await processStripeEvent(event("customer.subscription.updated", subscription("sub_A", { status: "canceled" }), NOW_SECONDS + 999));
  assert.equal(ignored.applied, false, "an ended subscription never hides the live one");
});

test("account deletion cancels the live subscription and deleted accounts never regain a plan", async () => {
  await cancelSubscriptionForDeletedAccount("u-paid");
  assert.deepEqual(fixture.cancelled, ["sub_B"]);
  await cancelSubscriptionForDeletedAccount("u-nobody");
  assert.deepEqual(fixture.cancelled, ["sub_B"]);

  await fixture.db.doc("deletedUsers/u-gone").set({ deletedAt: NOW });
  const result = await processStripeEvent(event("customer.subscription.created", subscription("sub_Z", { metadata: { uid: "u-gone" } }), NOW_SECONDS));
  assert.equal(result.applied, false);
  assert.equal(planDoc("u-gone"), undefined);

  const unmapped = await processStripeEvent(event("customer.subscription.created", subscription("sub_Y", { metadata: {} }), NOW_SECONDS));
  assert.deepEqual(unmapped, { handled: true, applied: false });
  const foreignPrice = await processStripeEvent(event("customer.subscription.created", subscription("sub_X", { items: { data: [{ price: { lookup_key: "legacy" } }] } }), NOW_SECONDS));
  assert.deepEqual(foreignPrice, { handled: true, applied: false });
  assert.deepEqual(await processStripeEvent(event("invoice.paid", {}, NOW_SECONDS)), { handled: false, applied: false });
});

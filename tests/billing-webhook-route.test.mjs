import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import Stripe from "stripe";

// Real Stripe signature verification with a local secret; event processing is
// recorded instead of touching Firestore.
process.env.STRIPE_SECRET_KEY = "sk_test_local_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_test_secret";
const fixture = { events: [], alerts: [], fail: false };
globalThis.__mathsolverWebhookTest = fixture;
const dataModule = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
const local = (path) => ({ url: new URL(`../src/lib/${path}`, import.meta.url).href, shortCircuit: true });
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return dataModule("export {};");
    if (specifier === "next/server") return dataModule('export const NextResponse = { json: (body, init) => Response.json(body, init) };');
    if (specifier === "@/lib/billing/events") return dataModule(`
      export async function processStripeEvent(event) { const f = globalThis.__mathsolverWebhookTest; if (f.fail) throw new Error("boom"); f.events.push(event); return { handled: true, applied: true }; }
    `);
    if (specifier === "@/lib/billing/alerts") return dataModule(`
      export async function sendBillingAlert(kind, fields) { globalThis.__mathsolverWebhookTest.alerts.push({ kind, fields }); return true; }
      export function describeError(error) { return error instanceof Error ? error.name + ": " + error.message : typeof error; }
    `);
    if (specifier.startsWith("@/lib/")) return local(specifier.slice("@/lib/".length) + ".ts");
    return nextResolve(specifier, context);
  },
});
const { POST: webhook } = await import("../src/app/api/billing/webhook/route.ts");
const signer = new Stripe("sk_test_signer_only");
const payload = JSON.stringify({
  id: "evt_1",
  object: "event",
  type: "customer.subscription.updated",
  created: 1_800_000_000,
  data: { object: { id: "sub_1", object: "subscription", status: "active", metadata: { uid: "user-1" }, items: { data: [] } } },
});
const request = (body, signature) => new Request("https://math-solver.io/api/billing/webhook", {
  method: "POST",
  headers: signature ? { "stripe-signature": signature, "content-type": "application/json" } : { "content-type": "application/json" },
  body,
});

test("a correctly signed event is processed once", async () => {
  Object.assign(fixture, { events: [], fail: false });
  const signature = signer.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const response = await webhook(request(payload, signature));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, handled: true, applied: true });
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].type, "customer.subscription.updated");
  assert.equal(fixture.events[0].data.object.metadata.uid, "user-1");
});

test("missing, forged, and tampered signatures are rejected before processing", async () => {
  Object.assign(fixture, { events: [], fail: false });
  assert.equal((await webhook(request(payload, null))).status, 400);
  const wrongSecret = signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_someone_else" });
  assert.equal((await webhook(request(payload, wrongSecret))).status, 400);
  const validForOtherBody = signer.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  assert.equal((await webhook(request(payload.replace("user-1", "user-2"), validForOtherBody))).status, 400);
  assert.equal(fixture.events.length, 0);
});

test("a processing failure returns 500 so Stripe retries the delivery", async () => {
  Object.assign(fixture, { events: [], fail: true });
  const signature = signer.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const response = await webhook(request(payload, signature));
  assert.equal(response.status, 500);
});

test("signature alerts fire only for Stripe-shaped bodies; processing failures always alert", async () => {
  Object.assign(fixture, { events: [], alerts: [], fail: false });
  const forgedProbe = signer.webhooks.generateTestHeaderString({ payload: "{}", secret: "whsec_someone_else" });
  assert.equal((await webhook(request("{}", forgedProbe))).status, 400);
  assert.equal(fixture.alerts.length, 0, "a probe or release check must not page the owner");
  const forgedEvent = signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_someone_else" });
  assert.equal((await webhook(request(payload, forgedEvent))).status, 400);
  assert.deepEqual(fixture.alerts.map((a) => a.kind), ["webhook_signature_invalid"]);
  Object.assign(fixture, { alerts: [], fail: true });
  const valid = signer.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  assert.equal((await webhook(request(payload, valid))).status, 500);
  assert.deepEqual(fixture.alerts.map((a) => a.kind), ["webhook_failed"]);
  assert.equal(fixture.alerts[0].fields.event, "customer.subscription.updated");
});

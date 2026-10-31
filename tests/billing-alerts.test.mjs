import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/server-only-loader.mjs";
import Stripe from "stripe";

// Telegram is replaced by a recording fetch; no network, no real token.
const calls = [];
let nextResponse = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: JSON.parse(init.body) });
  return nextResponse();
};
const alerts = await import("../src/lib/billing/alerts.ts");
const configure = () => {
  process.env.BILLING_TELEGRAM_BOT_TOKEN = "123:test-token";
  process.env.BILLING_TELEGRAM_CHAT_ID = "4242";
};

test("alerts are a no-op until a bot token and chat id are configured", async () => {
  delete process.env.BILLING_TELEGRAM_BOT_TOKEN;
  delete process.env.BILLING_TELEGRAM_CHAT_ID;
  calls.length = 0;
  assert.equal(alerts.isBillingAlertConfigured(), false);
  assert.equal(await alerts.sendBillingAlert("checkout_failed", { user: "u1" }), false);
  assert.equal(calls.length, 0);
});

test("a configured alert posts a plain-text message to the owner's chat", async () => {
  configure(); calls.length = 0; alerts.resetBillingAlertThrottle();
  assert.equal(alerts.isBillingAlertConfigured(), true);
  const sent = await alerts.sendBillingAlert("checkout_failed", { user: "user-1", plan: "plus/year", error: "Error: boom", skipped: null });
  assert.equal(sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.telegram.org/bot123:test-token/sendMessage");
  assert.equal(calls[0].body.chat_id, "4242");
  assert.match(calls[0].body.text, /Checkout failed/);
  assert.match(calls[0].body.text, /user: user-1\nplan: plus\/year\nerror: Error: boom/);
  assert.doesNotMatch(calls[0].body.text, /skipped/);
  assert.equal(calls[0].body.parse_mode, undefined, "plain text, so Stripe messages cannot break markup");
});

test("delivery failures are reported as false and never thrown", async () => {
  configure(); calls.length = 0; alerts.resetBillingAlertThrottle();
  nextResponse = () => new Response(JSON.stringify({ ok: false, description: "chat not found" }), { status: 400 });
  assert.equal(await alerts.sendBillingAlert("payment_succeeded", { amount: "4.99 USD" }), false);
  nextResponse = () => { throw new TypeError("fetch failed"); };
  assert.equal(await alerts.sendBillingAlert("payment_succeeded", { amount: "4.99 USD" }), false);
  nextResponse = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
});

test("repeated signature failures are throttled to one alert per window", async () => {
  configure(); calls.length = 0; alerts.resetBillingAlertThrottle();
  assert.equal(await alerts.sendBillingAlert("webhook_signature_invalid", { error: "bad" }), true);
  assert.equal(await alerts.sendBillingAlert("webhook_signature_invalid", { error: "bad" }), false);
  assert.equal(await alerts.sendBillingAlert("webhook_signature_invalid", { error: "bad" }), false);
  assert.equal(calls.length, 1);
  assert.equal(await alerts.sendBillingAlert("webhook_failed", { event: "x" }), true, "other kinds are not throttled");
  assert.equal(calls.length, 2);
});

test("errors and plans are summarised without leaking request bodies", () => {
  const stripeError = new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "No such price: price_x", code: "resource_missing", statusCode: 400 });
  assert.equal(alerts.describeError(stripeError), "StripeInvalidRequestError resource_missing 400: No such price: price_x");
  assert.equal(alerts.describeError(new Error("boom")), "Error: boom");
  assert.equal(alerts.describeError("weird"), "string");
  assert.equal(alerts.describePlan("plus_year"), "Plus yearly");
  assert.equal(alerts.describePlan("unlimited_month"), "Unlimited monthly");
  assert.equal(alerts.describePlan("legacy_price"), "legacy_price");
  assert.equal(alerts.describePlan(null), "unknown plan");
  assert.equal(alerts.formatAmount(2999, "usd"), "29.99 USD");
  assert.equal(alerts.formatAmount(null, "usd"), null);
  const text = alerts.formatBillingAlert("payment_succeeded", { plan: "Plus yearly", amount: "29.99 USD", email: "s@example.com" }, new Date("2026-10-31T22:15:00Z"));
  assert.equal(text, "✅ Payment received\nplan: Plus yearly\namount: 29.99 USD\nemail: s@example.com\nMathSolver · 2026-10-31 22:15 UTC");
});

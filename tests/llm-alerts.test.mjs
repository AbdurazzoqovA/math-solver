import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/server-only-loader.mjs";

const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
const llmAlerts = await import("../src/lib/llm-alerts.ts");
const owner = await import("../src/lib/owner-alerts.ts");

test("provider failures are categorised by status and message", () => {
  const c = llmAlerts.categorizeProviderFailure;
  assert.equal(c(400, "invalid_request_error Your credit balance is too low to access the Anthropic API."), "credits");
  assert.equal(c(429, "RESOURCE_EXHAUSTED You exceeded your current quota"), "credits");
  assert.equal(c(402, "Payment Required"), "credits");
  assert.equal(c(401, "authentication_error invalid x-api-key"), "auth");
  assert.equal(c(403, "permission denied"), "auth");
  assert.equal(c(429, "rate_limit_error Too many requests"), "rate_limit");
  assert.equal(c(529, "overloaded_error Overloaded"), "outage");
  assert.equal(c(500, ""), "outage");
  assert.equal(c(400, "invalid_request_error max_tokens too large"), "request");
});

test("error bodies are summarised from JSON or raw text without prompts", () => {
  const m = llmAlerts.providerErrorMessage;
  assert.equal(m('{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low."}}'), "invalid_request_error Your credit balance is too low.");
  assert.equal(m('{"error":{"code":"429","message":"Requests to the ChatCompletions_Create Operation have exceeded token rate limit."}}'), "429 Requests to the ChatCompletions_Create Operation have exceeded token rate limit.");
  assert.equal(m('{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}'), "RESOURCE_EXHAUSTED Quota exceeded");
  assert.equal(m("<html>Bad Gateway</html>"), "<html>Bad Gateway</html>");
  assert.equal(m(""), "");
});

test("a refusal pages the owner once per provider and category per window", async () => {
  process.env.BILLING_TELEGRAM_BOT_TOKEN = "123:test-token";
  process.env.BILLING_TELEGRAM_CHAT_ID = "4242";
  owner.resetOwnerAlertThrottle(); calls.length = 0;
  const body = '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}';
  assert.equal(await llmAlerts.reportProviderFailure("anthropic", 400, body), true);
  assert.equal(await llmAlerts.reportProviderFailure("anthropic", 400, body), false, "second one is throttled");
  assert.equal(await llmAlerts.reportProviderFailure("azure", 401, '{"error":{"code":"401","message":"Access denied due to invalid subscription key"}}'), true, "another provider/category is not throttled");
  assert.equal(calls.length, 2);
  assert.match(calls[0].body.text, /credits or quota exhausted/);
  assert.match(calls[0].body.text, /provider: anthropic\nstatus: 400\nerror: invalid_request_error Your credit balance is too low/);
  assert.match(calls[1].body.text, /rejected the API key/);
  delete process.env.BILLING_TELEGRAM_BOT_TOKEN; delete process.env.BILLING_TELEGRAM_CHAT_ID;
});

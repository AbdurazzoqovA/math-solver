import "./helpers/server-only-loader.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
const { generateText, streamText, getLLMProvider } = await import("../src/lib/llm.ts");
import { PRACTICE_STEPS_SCHEMA } from "../src/lib/llm-schemas.ts";

const options = {
  systemInstruction: "Explain the math.",
  messages: [{ role: "user", text: "3x = 15" }],
  temperature: 0.2,
  maxOutputTokens: 2000,
};
function setup(t, fetcher) {
  const before = { ...process.env };
  const original = globalThis.fetch;
  Object.assign(process.env, { LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key" });
  delete process.env.ANTHROPIC_MODEL;
  delete process.env.ANTHROPIC_EFFORT;
  globalThis.fetch = fetcher;
  t.after(() => { process.env = before; globalThis.fetch = original; });
}
const answer = (text, stop_reason = "end_turn") => Response.json({
  stop_reason, content: [{ type: "thinking", thinking: "private" }, { type: "text", text }],
});
const delta = text => ({ type: "content_block_delta", delta: { type: "text_delta", text } });
const completion = { type: "message_delta", delta: { stop_reason: "end_turn" } };
const stop = { type: "message_stop" };
function sse(events) {
  const bytes = new TextEncoder().encode(events.map(e => `event: ${e.type}\r\ndata: ${JSON.stringify(e)}`).join("\r\n\r\n"));
  return new Response(new ReadableStream({ start(c) {
    for (let i = 0; i < bytes.length; i++) c.enqueue(bytes.slice(i, i + 1));
    c.close();
  } }));
}

test("Claude selects Haiku with low effort, native schemas, and no unsupported sampling settings", async t => {
  setup(t, async (url, request) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(request.headers["x-api-key"], "test-key");
    const body = JSON.parse(request.body);
    assert.equal(body.model, "claude-haiku-5-5");
    assert.equal(body.max_tokens, 2000);
    assert.equal(body.temperature, undefined);
    assert.equal(body.store, undefined);
    assert.equal(body.output_config.effort, "low");
    assert.deepEqual(body.output_config.format.schema, PRACTICE_STEPS_SCHEMA);
    assert.equal(body.messages[1].role, "assistant");
    assert.equal(request.signal, optionsWithSignal.signal);
    return answer('{"steps":[{"title":"Divide","explanation":"$x = 5$"}]}');
  });
  const optionsWithSignal = { ...options, signal: AbortSignal.timeout(5000), responseMimeType: "application/json", jsonSchema: PRACTICE_STEPS_SCHEMA, messages: [...options.messages, { role: "model", text: "Previous answer" }] };
  assert.equal(getLLMProvider(), "anthropic");
  assert.equal(JSON.parse(await generateText(optionsWithSignal)).steps.length, 1);
});

test("Claude keeps images/PDFs inline and converts TIFF before vision", async t => {
  setup(t, async (_url, request) => {
    const blocks = JSON.parse(request.body).messages[0].content;
    assert.equal(blocks[0].type, "document");
    assert.equal(blocks[0].source.media_type, "application/pdf");
    assert.equal(blocks[0].source.data, "cGRm");
    assert.equal(blocks[1].type, "image");
    assert.equal(blocks[1].source.media_type, "image/png");
    assert.equal((await sharp(Buffer.from(blocks[1].source.data, "base64")).metadata()).width, 2);
    return answer("x = 5");
  });
  const tiff = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).tiff().toBuffer();
  await generateText({ ...options, messages: [{ role: "user", text: "Read", attachments: [{ mimeType: "application/pdf", data: "cGRm" }, { mimeType: "image/tiff", data: tiff.toString("base64") }] }] });
});

test("Claude streams only visible text across UTF-8 boundaries and a final event without newline", async t => {
  setup(t, async () => sse([
    { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "private" } },
    delta("**Step 1:** $x² = 25$ مرحبا"), completion, stop,
  ]));
  assert.equal(await new Response(await streamText(options)).text(), "**Step 1:** $x² = 25$ مرحبا");
});

test("Claude rejects truncated, refused, errored, empty, and token-limited streams", async t => {
  setup(t, async () => sse([]));
  for (const events of [
    [delta("partial")], [delta("partial"), completion], [delta("partial"), stop],
    [completion, stop], [delta("partial"), { type: "error", error: "private" }],
    [delta("partial"), { type: "message_delta", delta: { stop_reason: "max_tokens" } }, stop],
    [delta("partial"), { type: "message_delta", delta: { stop_reason: "refusal" } }, stop],
  ]) {
    globalThis.fetch = async () => sse(events);
    await assert.rejects(new Response(await streamText(options)).text(), { message: "Anthropic LLM stream failed" });
  }
});

test("cancelling Claude output cancels the upstream body", async t => {
  let cancelled = false;
  setup(t, async () => new Response(new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(delta("hello"))}\n\n`)); },
    cancel() { cancelled = true; },
  })));
  const reader = (await streamText(options)).getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(cancelled, true);
});

test("Claude errors hide upstream bodies and reject incomplete or malformed JSON", async t => {
  setup(t, async () => new Response("test-key private details", { status: 401 }));
  await assert.rejects(generateText(options), { message: "Anthropic LLM request failed (401)" });
  for (const reason of ["max_tokens", "refusal", "tool_use"]) {
    globalThis.fetch = async () => answer("partial private answer", reason);
    await assert.rejects(generateText(options), /did not complete/);
  }
  globalThis.fetch = async () => answer("private invalid JSON");
  await assert.rejects(generateText({ ...options, responseMimeType: "application/json", jsonSchema: PRACTICE_STEPS_SCHEMA }), { message: "Anthropic LLM returned invalid JSON" });
});

test("Claude fails before sending requests for missing secrets or JSON schemas", async t => {
  setup(t, async () => { assert.fail("Network must not be called"); });
  await assert.rejects(generateText({ ...options, responseMimeType: "application/json" }), /requires a schema/);
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(generateText(options), /not configured/);
});

import "./helpers/server-only-loader.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import bmp from "bmp-js";
const { generateText, streamText } = await import("../src/lib/llm.ts");
const { prepareLLMImage } = await import("../src/lib/llm-image.ts");

const endpoint = "https://example.services.ai.azure.com/openai/v1/responses";
const options = {
  systemInstruction: "Solve the math. Return JSON when requested.",
  messages: [{ role: "user", text: "3x + 5 = 20" }],
  temperature: 0.2,
  maxOutputTokens: 2000,
};
const completed = (text) => ({
  status: "completed",
  output: [
    {
      type: "reasoning",
      content: [{ type: "output_text", text: "private reasoning" }],
    },
    { type: "message", content: [{ type: "output_text", text }] },
  ],
});
function azure(t, fetcher) {
  const before = { ...process.env };
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    LLM_PROVIDER: "azure",
    AZURE_LLM_ENDPOINT: endpoint,
    AZURE_LLM_API_KEY: "test-llm-key",
    AZURE_LLM_DEPLOYMENT: "gpt-5-mini",
  });
  globalThis.fetch = fetcher;
  t.after(() => {
    process.env = before;
    globalThis.fetch = originalFetch;
  });
}
function sse(events, chunkSize = 7) {
  const data = new TextEncoder().encode(
    events.map((event) => `data: ${JSON.stringify(event)}`).join("\r\n\r\n"),
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < data.length; i += chunkSize)
          controller.enqueue(data.slice(i, i + chunkSize));
        controller.close();
      },
    }),
  );
}

test("Azure sends deployment, private stateless input, and reasoning-safe parameters", async (t) => {
  azure(t, async (url, request) => {
    assert.equal(String(url), endpoint);
    assert.equal(request.headers["api-key"], "test-llm-key");
    const body = JSON.parse(request.body);
    assert.equal(body.model, "gpt-5-mini");
    assert.equal(body.store, false);
    assert.equal(body.temperature, undefined);
    assert.deepEqual(body.reasoning, { effort: "low" });
    assert.equal(body.max_output_tokens, 6000);
    assert.equal(body.input[0].role, "developer");
    assert.match(body.input[0].content, /JSON/);
    assert.equal(body.input[2].role, "assistant");
    assert.equal(body.text.format.type, "json_object");
    return Response.json(completed('{"answer":5}'));
  });
  assert.equal(
    await generateText({
      ...options,
      responseMimeType: "application/json",
      messages: [
        ...options.messages,
        { role: "model", text: "Previous answer" },
      ],
    }),
    '{"answer":5}',
  );
});

test("GPT-4.1 nano works as an explicit deployment and default without reasoning parameters", async (t) => {
  azure(t, async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(body.model, "gpt-4.1-nano");
    assert.equal(body.reasoning, undefined);
    assert.equal(body.temperature, options.temperature);
    assert.equal(body.max_output_tokens, options.maxOutputTokens);
    assert.equal(body.text.format.type, "json_object");
    return Response.json(completed('{"answer":5}'));
  });
  process.env.AZURE_LLM_DEPLOYMENT = "gpt-4.1-nano";
  assert.equal(
    await generateText({ ...options, responseMimeType: "application/json" }),
    '{"answer":5}',
  );
  delete process.env.AZURE_LLM_DEPLOYMENT;
  assert.equal(
    await generateText({ ...options, responseMimeType: "application/json" }),
    '{"answer":5}',
  );
});

test("Azure streams only answer deltas across byte boundaries and flushes the final event", async (t) => {
  azure(t, async () =>
    sse([
      {
        type: "response.reasoning_summary_text.delta",
        delta: "private reasoning",
      },
      { type: "response.output_text.delta", delta: "**Step 1:** $x²" },
      { type: "response.output_text.delta", delta: " = 25$" },
      { type: "response.completed", response: { status: "completed" } },
    ]),
  );
  assert.equal(
    await new Response(await streamText(options)).text(),
    "**Step 1:** $x² = 25$",
  );
});

test("Azure truncated, failed, and incomplete streams fail instead of succeeding with partial answers", async (t) => {
  azure(t, async () =>
    sse([{ type: "response.output_text.delta", delta: "partial" }]),
  );
  await assert.rejects(
    new Response(await streamText(options)).text(),
    /stream failed/,
  );
  for (const type of [
    "response.failed",
    "response.incomplete",
    "error",
    "response.refusal.delta",
  ]) {
    globalThis.fetch = async () => sse([{ type, message: "private detail" }]);
    await assert.rejects(
      new Response(await streamText(options)).text(),
      /stream failed/,
    );
  }
});

test("cancelling a solver stream cancels its upstream request body", async (t) => {
  let cancelled = false;
  azure(
    t,
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"response.output_text.delta","delta":"hello"}\n\n',
              ),
            );
          },
          cancel() {
            cancelled = true;
          },
        }),
      ),
  );
  const reader = (await streamText(options)).getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(cancelled, true);
});

test("Azure supports inline PDF and image attachments", async (t) => {
  azure(t, async (_url, request) => {
    const content = JSON.parse(request.body).input[0].content;
    assert.equal(content[1].file_data, "data:application/pdf;base64,cGRm");
    assert.equal(content[2].image_url, "data:image/png;base64,cG5n");
    return Response.json(completed("x = 5"));
  });
  await generateText({
    ...options,
    messages: [
      {
        role: "user",
        text: "Read the problem.",
        attachments: [
          { mimeType: "application/pdf", data: "cGRm" },
          { mimeType: "image/png", data: "cG5n" },
        ],
      },
    ],
  });
});

test("Gemini rollback keeps model overrides and attachments", async (t) => {
  azure(t, async (url, request) => {
    assert.match(
      String(url),
      /generativelanguage.*review-test:generateContent/,
    );
    const body = JSON.parse(request.body);
    assert.equal(body.generationConfig.temperature, 0.2);
    assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/png");
    return Response.json({
      candidates: [{ content: { parts: [{ text: "five" }] } }],
    });
  });
  process.env.LLM_PROVIDER = "gemini";
  process.env.GOOGLE_CLOUD_API_KEY = "test-gemini-key";
  assert.equal(
    await generateText({
      ...options,
      geminiModel: "review-test",
      messages: [
        {
          role: "user",
          text: "Read",
          attachments: [{ mimeType: "image/png", data: "cG5n" }],
        },
      ],
    }),
    "five",
  );
});

test("provider errors and refusals never expose response bodies or credentials", async (t) => {
  azure(
    t,
    async () => new Response("test-llm-key private content", { status: 401 }),
  );
  await assert.rejects(generateText(options), {
    message: "Azure LLM request failed (401)",
  });
  globalThis.fetch = async () =>
    Response.json({ status: "incomplete", output: [] });
  await assert.rejects(generateText(options), /did not complete/);
  globalThis.fetch = async () =>
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "private detail" }],
        },
      ],
    });
  await assert.rejects(generateText(options), /no text content/);
});

test("TIFF and BMP uploads become readable PNGs while ordinary images and PDFs pass through", async () => {
  const tiff = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "white" },
  })
    .tiff()
    .toBuffer();
  const result = await prepareLLMImage(tiff.toString("base64"), "image/tiff");
  assert.equal(result.mimeType, "image/png");
  assert.equal(
    (await sharp(Buffer.from(result.data, "base64")).metadata()).width,
    2,
  );
  const bitmap = bmp.encode({
    width: 1,
    height: 1,
    data: Buffer.from([0, 10, 20, 30]),
  }).data;
  const converted = await prepareLLMImage(
    bitmap.toString("base64"),
    "image/bmp",
  );
  assert.deepEqual(
    [...(await sharp(Buffer.from(converted.data, "base64")).raw().toBuffer())],
    [30, 20, 10],
  );
  assert.deepEqual(await prepareLLMImage("unchanged", "application/pdf"), {
    data: "unchanged",
    mimeType: "application/pdf",
  });
  await assert.rejects(prepareLLMImage("invalid", "image/bmp"), /Invalid BMP/);
});

import "server-only";

import type { GenerateOptions } from "./gemini.ts";
import { prepareLLMImage } from "./llm-image.ts";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

async function callAnthropic(options: GenerateOptions, stream: boolean) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const effort = process.env.ANTHROPIC_EFFORT || "low";
  if (!["low", "medium", "high"].includes(effort))
    throw new Error("ANTHROPIC_EFFORT must be low, medium, or high");
  if (options.responseMimeType && !options.jsonSchema)
    throw new Error("Anthropic JSON output requires a schema");
  const messages = await Promise.all(options.messages.map(async (message) => ({
    role: message.role === "model" ? "assistant" : "user",
    content: [
      ...await Promise.all((message.attachments ?? []).map(async (attachment) => {
        const file = await prepareLLMImage(attachment.data, attachment.mimeType);
        return {
          type: file.mimeType === "application/pdf" ? "document" : "image",
          source: { type: "base64", media_type: file.mimeType, data: file.data },
        };
      })),
      { type: "text", text: message.text },
    ],
  })));
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: options.signal ?? AbortSignal.timeout(150_000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      system: options.systemInstruction,
      messages,
      stream,
      max_tokens: options.maxOutputTokens,
      // Haiku 5.5 uses adaptive thinking and rejects temperature/top_p/top_k.
      output_config: {
        effort,
        ...(options.responseMimeType ? {
          format: { type: "json_schema", schema: options.jsonSchema },
        } : {}),
      },
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Anthropic LLM request failed (${response.status})`);
  }
  return response;
}

export async function generateAnthropicText(options: GenerateOptions): Promise<string> {
  const response = await callAnthropic(options, false);
  const data = await response.json();
  if (data.stop_reason !== "end_turn")
    throw new Error("Anthropic LLM response did not complete");
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text).join("").trim();
  if (!text) throw new Error("Anthropic LLM returned no text content");
  if (options.responseMimeType) {
    try { JSON.parse(text); }
    catch { throw new Error("Anthropic LLM returned invalid JSON"); }
  }
  return text;
}

export async function streamAnthropicText(options: GenerateOptions): Promise<ReadableStream<Uint8Array>> {
  const response = await callAnthropic(options, true);
  if (!response.body) throw new Error("Anthropic LLM returned no response body");
  const reader = response.body.getReader();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let ended = false;
      let completed = false;
      let emitted = false;
      const consume = (line: string) => {
        if (!line.startsWith("data:")) return;
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === "error") throw new Error("Upstream stream error");
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" &&
            typeof event.delta.text === "string" && event.delta.text.length > 0) {
          controller.enqueue(encoder.encode(event.delta.text));
          emitted = true;
        } else if (event.type === "message_delta" && event.delta?.stop_reason) {
          if (event.delta.stop_reason !== "end_turn") throw new Error("Incomplete answer");
          completed = true;
        } else if (event.type === "message_stop") {
          ended = true;
        }
      };
      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) consume(line);
        }
        if (cancelled) return;
        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);
        if (!ended || !completed || !emitted) throw new Error("Incomplete stream");
        controller.close();
      } catch {
        if (!cancelled) controller.error(new Error("Anthropic LLM stream failed"));
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    },
    async cancel() {
      cancelled = true;
      await reader.cancel();
    },
  });
}

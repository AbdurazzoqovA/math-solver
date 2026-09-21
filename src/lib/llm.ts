import "server-only";

import {
  generateGeminiText,
  streamGeminiText,
  type GenerateOptions,
  type GeminiMessage,
} from "./gemini.ts";

export type LLMMessage = GeminiMessage;
export type { GenerateOptions };

export function getLLMProvider(): "azure" | "gemini" {
  const provider = (process.env.LLM_PROVIDER || "gemini").trim().toLowerCase();
  if (provider !== "azure" && provider !== "gemini") {
    throw new Error("LLM_PROVIDER must be azure or gemini");
  }
  return provider;
}

function azureConfig() {
  const apiKey = process.env.AZURE_LLM_API_KEY?.trim();
  if (!apiKey) throw new Error("AZURE_LLM_API_KEY is not configured");
  let endpoint: URL;
  try {
    endpoint = new URL(process.env.AZURE_LLM_ENDPOINT || "");
  } catch {
    throw new Error("AZURE_LLM_ENDPOINT is not configured");
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    !endpoint.pathname.endsWith("/openai/v1/responses")
  ) {
    throw new Error(
      "AZURE_LLM_ENDPOINT must be a complete HTTPS Responses URL",
    );
  }
  return {
    apiKey,
    endpoint,
    model: process.env.AZURE_LLM_DEPLOYMENT || "gpt-4.1-nano",
  };
}

async function callAzure(
  options: GenerateOptions,
  stream: boolean,
): Promise<Response> {
  const { apiKey, endpoint, model } = azureConfig();
  const usesReasoning = model.startsWith("gpt-5");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    signal: options.signal ?? AbortSignal.timeout(150_000),
    body: JSON.stringify({
      model,
      instructions: options.systemInstruction,
      input: [
        // Azure JSON mode checks the input messages for "json", even when the
        // separate instructions field already specifies a JSON contract.
        ...(options.responseMimeType
          ? [{ role: "developer", content: "Return a valid JSON object." }]
          : []),
        ...options.messages.map((message) => ({
          role: message.role === "model" ? "assistant" : "user",
          content: message.attachments?.length
            ? [
                { type: "input_text", text: message.text },
                ...message.attachments.map((attachment) =>
                  attachment.mimeType === "application/pdf"
                    ? {
                        type: "input_file",
                        filename: "problem.pdf",
                        file_data: `data:application/pdf;base64,${attachment.data}`,
                      }
                    : {
                        type: "input_image",
                        image_url: `data:${attachment.mimeType};base64,${attachment.data}`,
                        detail: "high",
                      },
                ),
              ]
            : message.text,
        })),
      ],
      store: false,
      stream,
      // GPT-4.1 rejects reasoning settings. Preserve GPT-5's reasoning budget
      // and omit its unsupported temperature when switching back to that model.
      ...(usesReasoning
        ? { reasoning: { effort: "low" } }
        : { temperature: options.temperature }),
      max_output_tokens: options.maxOutputTokens + (usesReasoning ? 4_000 : 0),
      text: {
        format: { type: options.responseMimeType ? "json_object" : "text" },
      },
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Azure LLM request failed (${response.status})`);
  }
  return response;
}

type AzureOutput = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function readAzureText(body: AzureOutput): string {
  if (body.status !== "completed")
    throw new Error("Azure LLM response did not complete");
  return (body.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
}

export async function generateText(options: GenerateOptions): Promise<string> {
  if (getLLMProvider() === "gemini") return generateGeminiText(options);
  const response = await callAzure(options, false);
  const text = readAzureText(await response.json()).trim();
  if (!text) throw new Error("Azure LLM returned no text content");
  return text;
}

export async function streamText(
  options: GenerateOptions,
): Promise<ReadableStream<Uint8Array>> {
  if (getLLMProvider() === "gemini") return streamGeminiText(options);
  const response = await callAzure(options, true);
  if (!response.body) throw new Error("Azure LLM returned no response body");
  const reader = response.body.getReader();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let completed = false;
      let emitted = false;
      const consume = (line: string) => {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          throw new Error("Azure LLM returned an invalid stream event");
        }
        if (
          event.type === "response.output_text.delta" &&
          typeof event.delta === "string"
        ) {
          controller.enqueue(encoder.encode(event.delta));
          emitted = true;
        } else if (event.type === "response.completed") {
          if (event.response?.status !== "completed")
            throw new Error("Azure LLM response did not complete");
          completed = true;
        } else if (
          [
            "error",
            "response.failed",
            "response.incomplete",
            "response.refusal.delta",
          ].includes(event.type)
        ) {
          throw new Error("Azure LLM could not complete the answer");
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
        if (!completed || !emitted)
          throw new Error("Azure LLM stream ended before the answer completed");
        controller.close();
      } catch {
        if (!cancelled) controller.error(new Error("Azure LLM stream failed"));
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

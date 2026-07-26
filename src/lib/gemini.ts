import "server-only";

type GeminiRole = "user" | "model";

export type GeminiMessage = {
  role: GeminiRole;
  text: string;
};

type GenerateOptions = {
  systemInstruction: string;
  messages: GeminiMessage[];
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: "application/json";
};

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

function getGeminiConfig() {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_CLOUD_API_KEY environment variable");
  }

  return { apiKey, model };
}

function buildPayload(options: GenerateOptions) {
  return {
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    contents: options.messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    })),
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      ...(options.responseMimeType
        ? { responseMimeType: options.responseMimeType }
        : {}),
    },
  };
}

async function callGemini(
  options: GenerateOptions,
  stream: boolean,
): Promise<Response> {
  const { apiKey, model } = getGeminiConfig();
  const operation = stream ? "streamGenerateContent" : "generateContent";
  const query = stream
    ? `alt=sse&key=${encodeURIComponent(apiKey)}`
    : `key=${encodeURIComponent(apiKey)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${operation}?${query}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(options)),
  });

  if (!response.ok) {
    console.error("Gemini API request failed with status", response.status);
    throw new Error(`Gemini API request failed (${response.status})`);
  }

  return response;
}

function readText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";
  const content = candidates[0]?.content;
  if (!content || typeof content !== "object") return "";
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) =>
      part && typeof part === "object" && "text" in part
        ? String(part.text)
        : "",
    )
    .join("");
}

export async function generateGeminiText(
  options: GenerateOptions,
): Promise<string> {
  const response = await callGemini(options, false);
  const data: unknown = await response.json();
  const text = readText(data).trim();
  if (!text) throw new Error("Gemini returned no text content");
  return text;
}

export async function streamGeminiText(
  options: GenerateOptions,
): Promise<ReadableStream<Uint8Array>> {
  const response = await callGemini(options, true);
  if (!response.body) throw new Error("Gemini returned no response body");

  const upstream = response.body;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const text = readText(JSON.parse(line.slice(6)));
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              console.warn("Gemini returned an unreadable stream event");
            }
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

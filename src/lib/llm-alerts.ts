import "server-only";

import { sendOwnerAlert } from "./owner-alerts.ts";

// Owner alerts for AI-provider refusals (exhausted credits, rejected key,
// rate limits, outages). One alert per provider and category every 15
// minutes; the body summary never includes prompts or answers.

export type LLMProviderName = "anthropic" | "azure" | "gemini";
export type ProviderFailureCategory =
  | "credits"
  | "auth"
  | "rate_limit"
  | "outage"
  | "request";

const THROTTLE_MS = 15 * 60 * 1_000;

const TITLES: Record<ProviderFailureCategory, string> = {
  credits:
    "🚨 AI provider refused: credits or quota exhausted, solving is failing",
  auth: "🚨 AI provider rejected the API key, solving is failing",
  rate_limit: "⚠️ AI provider rate limit hit, some requests are failing",
  outage: "⚠️ AI provider error, some requests are failing",
  request: "⚠️ AI provider rejected a request",
};

export function categorizeProviderFailure(
  status: number,
  message: string,
): ProviderFailureCategory {
  if (
    status === 402 ||
    /credit|balance|quota|insufficient|billing|spend limit|payment/i.test(
      message,
    )
  ) {
    return "credits";
  }
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "outage";
  return "request";
}

// A short human-readable reason from a provider error body. Provider error
// bodies describe the request outcome, not the user's content.
export function providerErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: unknown; type?: unknown; code?: unknown; status?: unknown } | string;
      message?: unknown;
    };
    const error =
      typeof parsed.error === "object" && parsed.error ? parsed.error : null;
    const message =
      error?.message ??
      (typeof parsed.error === "string" ? parsed.error : parsed.message);
    const parts = [error?.type ?? error?.status, error?.code, message].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );
    if (parts.length) return parts.join(" ").slice(0, 300);
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return body.replace(/\s+/g, " ").trim().slice(0, 200);
}

export function reportProviderFailure(
  provider: LLMProviderName,
  status: number,
  body: string,
): Promise<boolean> {
  const message = providerErrorMessage(body);
  const category = categorizeProviderFailure(status, message);
  return sendOwnerAlert({
    key: `llm:${provider}:${category}`,
    title: TITLES[category],
    throttleMs: THROTTLE_MS,
    fields: { provider, status, error: message || "no details in the response body" },
  });
}

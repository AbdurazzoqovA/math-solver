import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/captcha";
import {
  formatTelegramContactMessage,
  parseContactSubmission,
} from "@/lib/contact";

const TELEGRAM_TIMEOUT_MS = 10_000;
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;
const CONTACT_RATE_LIMIT_MAX = 5;
const CONTACT_TURNSTILE_ACTION = "mathsolver_request";
const DEFAULT_CONTACT_TURNSTILE_HOSTNAMES = [
  "math-solver.io",
  "www.math-solver.io",
] as const;

type ContactRateLimitStore = Map<string, number[]>;

const globalContactRateLimit = globalThis as typeof globalThis & {
  __mathsolverContactRateLimit?: ContactRateLimitStore;
};
const contactRateLimit: ContactRateLimitStore =
  globalContactRateLimit.__mathsolverContactRateLimit ??
  new Map<string, number[]>();

if (process.env.NODE_ENV !== "production") {
  globalContactRateLimit.__mathsolverContactRateLimit = contactRateLimit;
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function contactTurnstileHostnames() {
  const configured = process.env.CONTACT_TURNSTILE_HOSTNAMES;
  if (!configured) return [...DEFAULT_CONTACT_TURNSTILE_HOSTNAMES];

  return configured
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

function allowContactAttempt(ip: string) {
  const now = Date.now();
  const recentAttempts = (contactRateLimit.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < CONTACT_RATE_LIMIT_WINDOW_MS,
  );

  if (recentAttempts.length >= CONTACT_RATE_LIMIT_MAX) {
    contactRateLimit.set(ip, recentAttempts);
    return false;
  }

  recentAttempts.push(now);
  contactRateLimit.set(ip, recentAttempts);
  return true;
}

export async function POST(request: Request) {
  const productionRequest = process.env.NODE_ENV === "production";
  const validation = await validateRequest(request, {
    requireCaptcha: productionRequest,
    failClosed: productionRequest,
    expectedAction: productionRequest ? CONTACT_TURNSTILE_ACTION : undefined,
    allowedHostnames: productionRequest
      ? contactTurnstileHostnames()
      : undefined,
  });

  if (!validation.allowed) {
    return noStoreJson(
      { error: validation.error },
      { status: validation.status },
    );
  }

  const website = validation.body.website;
  if (typeof website === "string" && website.trim()) {
    return noStoreJson({ accepted: true });
  }

  const submission = parseContactSubmission(validation.body);
  if (!submission.ok) {
    return noStoreJson(
      {
        error: "Check the highlighted fields and try again.",
        fieldErrors: submission.errors,
      },
      { status: 400 },
    );
  }

  if (!allowContactAttempt(validation.ip)) {
    return noStoreJson(
      { error: "Too many messages were sent. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": "3600" },
      },
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error("Contact delivery is not configured.");
    return noStoreJson(
      { error: "Contact support is temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatTelegramContactMessage(submission.value),
          link_preview_options: { is_disabled: true },
          protect_content: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      },
    );
    const telegramResult = (await telegramResponse.json().catch(() => null)) as
      | { ok?: unknown }
      | null;

    if (!telegramResponse.ok || telegramResult?.ok !== true) {
      console.error("Telegram contact delivery failed.", {
        status: telegramResponse.status,
      });
      return noStoreJson(
        { error: "Your message could not be sent. Please try again." },
        { status: 502 },
      );
    }

    return noStoreJson({ accepted: true });
  } catch (error) {
    console.error("Telegram contact delivery failed.", {
      name: error instanceof Error ? error.name : typeof error,
    });
    return noStoreJson(
      { error: "Your message could not be sent. Please try again." },
      { status: 502 },
    );
  }
}

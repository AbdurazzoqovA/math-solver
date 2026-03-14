/**
 * Cloudflare Turnstile captcha verification + IP-based rate limiting fallback.
 *
 * Two paths:
 *   1. Token present  → verify with Cloudflare. Valid → allow. Invalid → 403.
 *   2. Token absent   → IP rate-limit (30 req/hr). Under limit → allow. Over → 429.
 *
 * Edge cases:
 *   - Cloudflare API unreachable → treat as "no token" (fail-open to rate limit)
 *   - TURNSTILE_SECRET_KEY missing → allow all (dev mode)
 *   - Handles x-forwarded-for, x-real-ip, cf-connecting-ip for IP extraction
 */

// ── Rate limiter (in-memory, per-instance) ─────────────────────────

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 60; // requests per window

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks (every 10 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < RATE_LIMIT_WINDOW_MS
      );
      // If no timestamps left, remove the entry entirely
      if (entry.timestamps.length === 0) {
        rateLimitMap.delete(ip);
      }
    }
  }, 10 * 60 * 1000);
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(ip, entry);
  }

  // Prune old timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    // Over limit — find when the oldest request in window expires
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + RATE_LIMIT_WINDOW_MS;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Under limit — record this request
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - entry.timestamps.length,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  };
}

// ── Cloudflare Turnstile verification ──────────────────────────────

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyCaptcha(
  token: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Dev mode: no secret key configured → pass through
    return { success: true };
  }

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip,
      }),
    });

    if (!res.ok) {
      // Cloudflare API error → fail-open to rate limiting
      console.warn(
        `Turnstile API returned ${res.status}, falling back to rate limit`
      );
      return { success: false, error: "cloudflare_api_error" };
    }

    const data = await res.json();
    if (data.success) {
      return { success: true };
    }

    // Token was invalid or expired
    return {
      success: false,
      error: (data["error-codes"] || ["invalid-token"]).join(", "),
    };
  } catch (err) {
    // Network error reaching Cloudflare → fail-open
    console.warn("Turnstile verification network error:", err);
    return { success: false, error: "network_error" };
  }
}

// ── IP extraction helper ───────────────────────────────────────────

function getClientIp(req: Request): string {
  const headers = new Headers(req.headers);

  // Cloudflare's real client IP (most reliable in CF environments)
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Standard proxy header
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

// ── Main validation function ───────────────────────────────────────

export type ValidationResult =
  | {
    allowed: true;
    ip: string;
    body: Record<string, unknown>;
  }
  | {
    allowed: false;
    status: number;
    error: string;
    ip: string;
  };

export async function validateRequest(req: Request): Promise<ValidationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const ip = getClientIp(req);

  // Dev mode: no secret configured → allow everything
  if (!secretKey) {
    try {
      const body = await req.json();
      const { captchaToken: _, ...rest } = body;
      return { allowed: true, ip, body: rest };
    } catch {
      return { allowed: true, ip, body: {} };
    }
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return {
      allowed: false,
      status: 400,
      error: "Invalid JSON body.",
      ip,
    };
  }

  const { captchaToken, ...restBody } = body as Record<string, unknown>;

  // Path 1: Token provided → verify with Cloudflare
  if (captchaToken && typeof captchaToken === "string") {
    const result = await verifyCaptcha(captchaToken, ip);

    if (result.success) {
      return { allowed: true, ip, body: restBody };
    }

    // If the error was a CF API/network issue, fall through to rate limit
    if (
      result.error === "cloudflare_api_error" ||
      result.error === "network_error"
    ) {
      // Fall through to rate limiting below
    } else {
      // Token was genuinely invalid or expired
      return {
        allowed: false,
        status: 403,
        error: "Captcha verification failed. Please refresh and try again.",
        ip,
      };
    }
  }

  // Path 2: No token (ad blocker, script failure, CF API error fallback)
  const rateResult = checkRateLimit(ip);

  if (!rateResult.allowed) {
    return {
      allowed: false,
      status: 429,
      error: "Rate limit exceeded. Please try again later.",
      ip,
    };
  }

  return { allowed: true, ip, body: restBody };
}

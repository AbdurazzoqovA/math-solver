/**
 * Cloudflare Turnstile captcha verification + IP-based rate limiting fallback.
 *
 * Two modes:
 *   1. Default endpoints keep the legacy graceful fallback to an in-memory
 *      per-instance IP rate limit.
 *   2. Costly endpoints can require a valid Turnstile token and fail closed.
 *
 * Edge cases:
 *   - Cloudflare API unreachable → caller chooses fail-closed or rate fallback
 *   - TURNSTILE_SECRET_KEY missing → required mode returns 503
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
  const cleanupTimer = setInterval(() => {
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
  if (
    typeof cleanupTimer === "object" &&
    "unref" in cleanupTimer &&
    typeof cleanupTimer.unref === "function"
  ) {
    cleanupTimer.unref();
  }
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
const TURNSTILE_TIMEOUT_MS = 10_000;
const TURNSTILE_MAX_TOKEN_LENGTH = 2_048;

type CaptchaVerification = {
  success: boolean;
  error?: "cloudflare_api_error" | "network_error" | "invalid_token";
  hostname?: string;
  action?: string;
};

async function verifyCaptcha(
  token: string,
  ip: string,
): Promise<CaptchaVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, error: "cloudflare_api_error" };
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
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Cloudflare API error → fail-open to rate limiting
      console.warn(
        `Turnstile API returned ${res.status}, falling back to rate limit`
      );
      return { success: false, error: "cloudflare_api_error" };
    }

    const data = (await res.json()) as {
      success?: unknown;
      hostname?: unknown;
      action?: unknown;
      "error-codes"?: unknown;
    };
    if (data.success === true) {
      return {
        success: true,
        hostname:
          typeof data.hostname === "string"
            ? data.hostname.trim().toLowerCase()
            : undefined,
        action: typeof data.action === "string" ? data.action : undefined,
      };
    }

    // Token was invalid or expired
    return { success: false, error: "invalid_token" };
  } catch {
    // The caller decides whether an availability failure is fail-closed.
    console.warn("Turnstile verification network error");
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

export type RequestValidationOptions = {
  captchaAlreadyVerified?: boolean;
  requireCaptcha?: boolean;
  failClosed?: boolean;
  expectedAction?: string;
  allowedHostnames?: readonly string[];
};

function rejection(
  status: number,
  error: string,
  ip: string,
): ValidationResult {
  return { allowed: false, status, error, ip };
}

export async function validateRequest(
  req: Request,
  options: RequestValidationOptions = {},
): Promise<ValidationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const ip = getClientIp(req);

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return rejection(400, "Invalid JSON body.", ip);
  }

  const { captchaToken, ...restBody } = body as Record<string, unknown>;

  if (options.captchaAlreadyVerified) {
    return { allowed: true, ip, body: restBody };
  }

  if (!secretKey) {
    if (options.requireCaptcha) {
      return rejection(
        503,
        "Request verification is temporarily unavailable.",
        ip,
      );
    }
    return { allowed: true, ip, body: restBody };
  }

  // Path 1: Token provided → verify with Cloudflare
  if (
    captchaToken &&
    typeof captchaToken === "string" &&
    captchaToken.length <= TURNSTILE_MAX_TOKEN_LENGTH
  ) {
    const result = await verifyCaptcha(captchaToken, ip);

    if (result.success) {
      if (
        options.expectedAction &&
        result.action !== options.expectedAction
      ) {
        return rejection(
          403,
          "Captcha verification failed. Please refresh and try again.",
          ip,
        );
      }
      if (
        options.allowedHostnames?.length &&
        (!result.hostname ||
          !options.allowedHostnames.includes(result.hostname))
      ) {
        return rejection(
          403,
          "Captcha verification failed. Please refresh and try again.",
          ip,
        );
      }
      return { allowed: true, ip, body: restBody };
    }

    // Availability failures either fail closed or fall through to rate limit.
    if (
      result.error === "cloudflare_api_error" ||
      result.error === "network_error"
    ) {
      if (options.failClosed) {
        return rejection(
          503,
          "Request verification is temporarily unavailable.",
          ip,
        );
      }
    } else {
      // Token was genuinely invalid or expired
      return rejection(
        403,
        "Captcha verification failed. Please refresh and try again.",
        ip,
      );
    }
  } else if (options.requireCaptcha) {
    return rejection(
      403,
      "Complete the verification check and try again.",
      ip,
    );
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

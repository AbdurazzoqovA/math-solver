import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { videoQuotaPeriod } from "@/lib/video/quota";
import { PLAN_LIMITS, type PlanTier } from "./plans.ts";
import {
  DAILY_LIMIT_CODE,
  planLimitFor,
  type MeteredFeature,
} from "./limits.ts";
import { effectivePlanTier } from "./subscription-state.ts";

// Daily allowances for scans and quizzes.
//  - Signed-in users: Firestore bucket users/{uid}/entitlements/usage,
//    limit from the plan entitlement. Paid tiers with a null limit are never
//    counted, so they cost no writes.
//  - Web guests: an HMAC-signed, httpOnly cookie carrying today's counts. It
//    is a soft gate (clearing cookies resets it) that keeps anonymous use
//    bounded without blocking shared school networks by IP.
//  - Anonymous mobile requests: unmetered until the app sends an ID token.
// Usage is checked before the model call and recorded only after success, so
// a failed scan never costs an allowance.

export const GUEST_USAGE_COOKIE = "ms_usage";
const COOKIE_MAX_AGE_SECONDS = 2 * 24 * 60 * 60;

type GuestCounts = { d: string; s: number; q: number };

export type UsageIdentity =
  | { kind: "user"; uid: string }
  | { kind: "guest"; counts: GuestCounts | null }
  | { kind: "anonymous" };

export type UsageCheck = {
  identity: UsageIdentity;
  feature: MeteredFeature;
  tier: PlanTier;
  limit: number | null;
  used: number;
  allowed: boolean;
  periodKey: string;
  resetsAt: number;
};

export type UsageOptions = {
  // Web requests may be metered with a signed cookie; mobile clients cannot
  // persist cookies, so their anonymous requests pass through.
  guestCookies?: boolean;
  now?: number;
};

const globalUsage = globalThis as typeof globalThis & {
  __mathsolverGuestUsageSecret?: Buffer;
  __mathsolverGuestUsageWarned?: boolean;
};

function guestSecret(): Buffer {
  const configured = process.env.GUEST_USAGE_SECRET;
  if (configured) return Buffer.from(configured, "utf8");
  if (!globalUsage.__mathsolverGuestUsageSecret) {
    globalUsage.__mathsolverGuestUsageSecret = randomBytes(32);
    if (
      process.env.NODE_ENV === "production" &&
      !globalUsage.__mathsolverGuestUsageWarned
    ) {
      globalUsage.__mathsolverGuestUsageWarned = true;
      console.warn(
        "GUEST_USAGE_SECRET is not set; guest usage cookies are per-instance only.",
      );
    }
  }
  return globalUsage.__mathsolverGuestUsageSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", guestSecret()).update(payload).digest("base64url");
}

function featureKey(feature: MeteredFeature): "s" | "q" {
  return feature === "scans" ? "s" : "q";
}

function countOf(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

export function parseGuestUsageCookie(
  cookieHeader: string | null,
): GuestCounts | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_USAGE_COOKIE}=`));
  if (!pair) return null;
  const [payload, signature] = pair.slice(GUEST_USAGE_COOKIE.length + 1).split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (typeof parsed.d !== "string") return null;
    return { d: parsed.d, s: countOf(parsed.s), q: countOf(parsed.q) };
  } catch {
    return null;
  }
}

export function serializeGuestUsageCookie(counts: GuestCounts): string {
  const payload = Buffer.from(JSON.stringify(counts), "utf8").toString(
    "base64url",
  );
  const attributes = [
    `${GUEST_USAGE_COOKIE}=${payload}.${sign(payload)}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}

async function resolveIdentity(
  request: Request,
  guestCookies: boolean,
): Promise<UsageIdentity> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        return { kind: "user", uid: decoded.uid };
      } catch {
        // A stale session must not block a free feature; fall through.
      }
    }
  }
  if (guestCookies) {
    return {
      kind: "guest",
      counts: parseGuestUsageCookie(request.headers.get("cookie")),
    };
  }
  return { kind: "anonymous" };
}

function usageRef(uid: string) {
  return getAdminFirestore().doc(`users/${uid}/entitlements/usage`);
}

function planRef(uid: string) {
  return getAdminFirestore().doc(`users/${uid}/entitlements/plan`);
}

export async function checkUsage(
  request: Request,
  feature: MeteredFeature,
  options: UsageOptions = {},
): Promise<UsageCheck> {
  const now = options.now ?? Date.now();
  const period = videoQuotaPeriod(now);
  const identity = await resolveIdentity(request, options.guestCookies !== false);
  const base = {
    identity,
    feature,
    periodKey: period.key,
    resetsAt: period.resetsAt,
  };

  if (identity.kind === "anonymous") {
    return { ...base, tier: "free", limit: null, used: 0, allowed: true };
  }

  if (identity.kind === "guest") {
    const limit = planLimitFor(PLAN_LIMITS.free, feature);
    const counts = identity.counts;
    const used =
      counts && counts.d === period.key ? counts[featureKey(feature)] : 0;
    return {
      ...base,
      tier: "free",
      limit,
      used,
      allowed: limit === null || used < limit,
    };
  }

  const [planSnapshot, usageSnapshot] = await Promise.all([
    planRef(identity.uid).get(),
    usageRef(identity.uid).get(),
  ]);
  const tier = effectivePlanTier(planSnapshot.data(), now);
  const limit = planLimitFor(PLAN_LIMITS[tier], feature);
  if (limit === null) {
    return { ...base, tier, limit, used: 0, allowed: true };
  }
  const usage = usageSnapshot.data();
  const used =
    usage?.periodKey === period.key ? countOf(usage[feature]) : 0;
  return { ...base, tier, limit, used, allowed: used < limit };
}

// Call after the feature succeeded. Returns a Set-Cookie value for guests.
export async function recordUsage(
  check: UsageCheck,
): Promise<{ setCookie: string | null }> {
  if (check.limit === null) return { setCookie: null };

  if (check.identity.kind === "guest") {
    const previous =
      check.identity.counts && check.identity.counts.d === check.periodKey
        ? check.identity.counts
        : { d: check.periodKey, s: 0, q: 0 };
    const next = { ...previous, d: check.periodKey };
    next[featureKey(check.feature)] += 1;
    return { setCookie: serializeGuestUsageCookie(next) };
  }

  if (check.identity.kind === "user") {
    const ref = usageRef(check.identity.uid);
    const { feature, periodKey } = check;
    await getAdminFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.data();
      const samePeriod = current?.periodKey === periodKey;
      transaction.set(ref, {
        schemaVersion: 1,
        periodKey,
        scans: (samePeriod ? countOf(current?.scans) : 0) + (feature === "scans" ? 1 : 0),
        quizzes:
          (samePeriod ? countOf(current?.quizzes) : 0) + (feature === "quizzes" ? 1 : 0),
        updatedAt: Date.now(),
      });
    });
  }
  return { setCookie: null };
}

const LIMIT_MESSAGES: Record<MeteredFeature, (limit: number) => string> = {
  scans: (limit) =>
    `You have used today's ${limit} free scans. Typing the problem is always free, and more scans unlock after the daily reset.`,
  quizzes: (limit) =>
    limit === 1
      ? "You have used today's free practice quiz. More quizzes unlock after the daily reset."
      : `You have used today's ${limit} free practice quizzes. More unlock after the daily reset.`,
};

// Neutral wording on purpose: the same message reaches the mobile app, where
// store rules forbid pointing at a web purchase. The web client adds the link.
export function usageLimitBody(check: UsageCheck) {
  const limit = check.limit ?? 0;
  return {
    error: LIMIT_MESSAGES[check.feature](limit),
    code: DAILY_LIMIT_CODE,
    feature: check.feature,
    limit,
    used: check.used,
    resetsAt: check.resetsAt,
    tier: check.tier,
  };
}

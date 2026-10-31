import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { VideoAuthError } from "@/lib/firebase-admin";
import { BillingServiceError } from "./stripe.ts";

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function billingErrorResponse(error: unknown, fallback: string) {
  if (error instanceof VideoAuthError || error instanceof BillingServiceError) {
    return noStoreJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof Stripe.errors.StripeError) {
    console.error("Stripe request failed:", {
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    });
    return noStoreJson(
      { error: fallback, code: "payment_provider_error" },
      { status: 502 },
    );
  }
  console.error(
    "Billing request failed:",
    error instanceof Error ? error.name : typeof error,
  );
  return noStoreJson({ error: fallback, code: "billing_error" }, { status: 500 });
}

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

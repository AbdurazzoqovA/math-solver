import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { VideoAuthError } from "@/lib/firebase-admin";
import {
  describeError,
  sendBillingAlert,
  type BillingAlertFields,
  type BillingAlertKind,
} from "./alerts.ts";
import { BillingServiceError } from "./stripe.ts";

// Which owner alert a failing route raises; expected 4xx outcomes (sign-in,
// validation, 409) are not incidents and never alert.
export type BillingErrorContext = {
  alert: Extract<BillingAlertKind, "checkout_failed" | "portal_failed" | "sync_failed">;
  uid?: string;
  fields?: BillingAlertFields;
};

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function billingErrorResponse(
  error: unknown,
  fallback: string,
  context?: BillingErrorContext,
) {
  if (error instanceof VideoAuthError || error instanceof BillingServiceError) {
    if (context && error.status >= 500) await alertOwner(context, error);
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
    if (context) await alertOwner(context, error);
    return noStoreJson(
      { error: fallback, code: "payment_provider_error" },
      { status: 502 },
    );
  }
  console.error(
    "Billing request failed:",
    error instanceof Error ? error.name : typeof error,
  );
  if (context) await alertOwner(context, error);
  return noStoreJson({ error: fallback, code: "billing_error" }, { status: 500 });
}

function alertOwner(context: BillingErrorContext, error: unknown) {
  return sendBillingAlert(context.alert, {
    ...context.fields,
    user: context.uid ?? "not signed in",
    error: describeError(error),
  });
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

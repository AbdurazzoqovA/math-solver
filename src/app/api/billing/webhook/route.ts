import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { processStripeEvent } from "@/lib/billing/events";
import {
  BillingServiceError,
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature." }, 400);

  // The raw body is required for signature verification; never parse first.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return json({ error: error.message }, error.status);
    }
    return json({ error: "Invalid signature." }, 400);
  }

  try {
    const result = await processStripeEvent(event);
    return json({ received: true, ...result }, 200);
  } catch (error) {
    // A non-2xx response makes Stripe retry the delivery.
    console.error("Stripe webhook failed:", {
      type: event.type,
      name: error instanceof Error ? error.name : typeof error,
    });
    return json({ error: "Webhook processing failed." }, 500);
  }
}

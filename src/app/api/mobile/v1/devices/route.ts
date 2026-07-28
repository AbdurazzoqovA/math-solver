import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/captcha";
import {
  getAdminFirestore,
  verifyVideoRequest,
  VideoAuthError,
} from "@/lib/firebase-admin";
import { mobileAppCheckFailure } from "@/lib/mobile-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length >= 20 && value.length <= 4_096;
}

export async function POST(request: Request) {
  try {
    const failure = await mobileAppCheckFailure(request);
    if (failure) return failure;
    const user = await verifyVideoRequest(request);
    const validation = await validateRequest(request);
    if (!validation.allowed) {
      return noStoreJson(
        { error: validation.error, code: "request_validation_failed" },
        { status: validation.status },
      );
    }
    const { token, platform, appVersion } = validation.body as {
      token?: unknown;
      platform?: unknown;
      appVersion?: unknown;
    };
    if (
      !validToken(token) ||
      (platform !== "ios" && platform !== "android") ||
      typeof appVersion !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(appVersion)
    ) {
      return noStoreJson(
        { error: "The notification token is invalid.", code: "invalid_token" },
        { status: 400 },
      );
    }

    const tokenId = createHash("sha256").update(token).digest("hex");
    const db = getAdminFirestore();
    const registryRef = db.doc(`mobileDevices/${tokenId}`);
    const deviceRef = db.doc(`users/${user.uid}/devices/${tokenId}`);
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
      const registry = await transaction.get(registryRef);
      const previousOwner = registry.data()?.uid;
      if (typeof previousOwner === "string" && previousOwner !== user.uid) {
        transaction.delete(
          db.doc(`users/${previousOwner}/devices/${tokenId}`),
        );
      }
      transaction.set(registryRef, { uid: user.uid, updatedAt: now });
      transaction.set(deviceRef, {
        token,
        platform,
        appVersion,
        updatedAt: now,
      });
    });
    return noStoreJson({ registered: true });
  } catch (error) {
    if (error instanceof VideoAuthError) {
      return noStoreJson(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error(
      "Mobile notification registration failed",
      error instanceof Error ? error.name : typeof error,
    );
    return noStoreJson(
      {
        error: "Video-ready notifications could not be enabled.",
        code: "notification_registration_failed",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const failure = await mobileAppCheckFailure(request);
    if (failure) return failure;
    const user = await verifyVideoRequest(request);
    const validation = await validateRequest(request);
    if (!validation.allowed) {
      return noStoreJson(
        { error: validation.error, code: "request_validation_failed" },
        { status: validation.status },
      );
    }
    const { token } = validation.body as { token?: unknown };
    if (!validToken(token)) {
      return noStoreJson(
        { error: "The notification token is invalid.", code: "invalid_token" },
        { status: 400 },
      );
    }

    const tokenId = createHash("sha256").update(token).digest("hex");
    const db = getAdminFirestore();
    const registryRef = db.doc(`mobileDevices/${tokenId}`);
    const deviceRef = db.doc(`users/${user.uid}/devices/${tokenId}`);
    await db.runTransaction(async (transaction) => {
      const registry = await transaction.get(registryRef);
      if (registry.data()?.uid === user.uid) {
        transaction.delete(registryRef);
      }
      transaction.delete(deviceRef);
    });
    return noStoreJson({ registered: false });
  } catch (error) {
    if (error instanceof VideoAuthError) {
      return noStoreJson(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error(
      "Mobile notification removal failed",
      error instanceof Error ? error.name : typeof error,
    );
    return noStoreJson(
      {
        error: "Video-ready notifications could not be disabled.",
        code: "notification_removal_failed",
      },
      { status: 500 },
    );
  }
}

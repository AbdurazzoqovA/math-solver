import { NextResponse } from "next/server";
import {
  getAdminAuth,
  getAdminFirestore,
  verifyAccountRequest,
  VideoAuthError,
} from "@/lib/firebase-admin";
import { mobileAppCheckFailure } from "@/lib/mobile-request";
import { deleteLessonObjects } from "@/lib/video/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function DELETE(request: Request) {
  try {
    const failure = await mobileAppCheckFailure(request);
    if (failure) return failure;

    const user = await verifyAccountRequest(request);
    const nowSeconds = Math.floor(Date.now() / 1_000);
    if (
      typeof user.auth_time !== "number" ||
      nowSeconds - user.auth_time > 10 * 60
    ) {
      throw new VideoAuthError(
        "Sign in again before deleting your account.",
        403,
        "recent_sign_in_required",
      );
    }
    const db = getAdminFirestore();
    const userRef = db.doc(`users/${user.uid}`);
    const [, devicesSnapshot] = await Promise.all([
      deleteLessonObjects(`video-lessons/${user.uid}/`),
      userRef.collection("devices").get(),
    ]);

    await Promise.all(
      devicesSnapshot.docs.map(async (device) => {
        const registryRef = db.doc(`mobileDevices/${device.id}`);
        await db.runTransaction(async (transaction) => {
          const registry = await transaction.get(registryRef);
          if (registry.data()?.uid === user.uid) {
            transaction.delete(registryRef);
          }
        });
      }),
    );

    await db.recursiveDelete(userRef);
    await getAdminAuth().deleteUser(user.uid);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof VideoAuthError) {
      return noStoreJson(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error(
      "Account deletion failed",
      error instanceof Error ? error.name : typeof error,
    );
    return noStoreJson(
      {
        error:
          "Your account deletion could not be completed. Please try again.",
        code: "account_deletion_failed",
      },
      { status: 500 },
    );
  }
}

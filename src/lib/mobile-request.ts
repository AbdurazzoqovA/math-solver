import "server-only";

import { getAppCheck } from "firebase-admin/app-check";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";

const APP_CHECK_HEADER = "x-firebase-appcheck";

function rejection(message: string, code: string) {
  const response = NextResponse.json(
    { error: message, code },
    { status: 401 },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function mobileAppCheckFailure(
  request: Request,
  options: { required?: boolean } = {},
): Promise<Response | null> {
  const token = request.headers.get(APP_CHECK_HEADER)?.trim();
  const enforced =
    options.required || process.env.MOBILE_APP_CHECK_ENFORCED === "true";

  if (!token) {
    return enforced
      ? rejection(
          "This mobile build could not be verified. Update the app and retry.",
          "app_check_required",
        )
      : null;
  }

  try {
    await getAppCheck(getFirebaseAdminApp()).verifyToken(token);
    return null;
  } catch {
    return rejection(
      "This mobile build could not be verified. Update the app and retry.",
      "invalid_app_check_token",
    );
  }
}

export function withMobileAppCheck(
  handler: (request: Request) => Promise<Response>,
) {
  return async function mobileHandler(request: Request): Promise<Response> {
    const failure = await mobileAppCheckFailure(request);
    return failure ?? handler(request);
  };
}

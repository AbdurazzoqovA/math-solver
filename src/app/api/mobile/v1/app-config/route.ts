import { NextResponse } from "next/server";
import {
  isValidMobileVersion,
  mobileVersionPolicyFromEnvironment,
  type MobilePlatform,
} from "@/lib/mobile-version-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const version = searchParams.get("version") ?? "";

  if (
    (platform !== "ios" && platform !== "android") ||
    !isValidMobileVersion(version)
  ) {
    return NextResponse.json(
      { error: "A valid platform and x.y.z app version are required." },
      { status: 400 },
    );
  }

  const response = NextResponse.json(
    mobileVersionPolicyFromEnvironment(platform as MobilePlatform, version),
  );
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, stale-while-revalidate=300",
  );
  return response;
}

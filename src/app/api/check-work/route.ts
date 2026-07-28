import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/captcha";
import {
  checkHandwrittenWork,
  MAX_REVIEW_IMAGE_BYTES,
  REVIEW_IMAGE_TYPES,
} from "@/lib/math-review";

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const { base64, mimeType } = validation.body as {
      base64?: unknown;
      mimeType?: unknown;
    };
    if (
      typeof base64 !== "string" ||
      typeof mimeType !== "string" ||
      !REVIEW_IMAGE_TYPES.has(mimeType)
    ) {
      return NextResponse.json(
        { error: "Upload a JPEG, PNG, or WebP image of your work." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_REVIEW_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The work image must be between 1 byte and 10 MB." },
        { status: 400 },
      );
    }

    return NextResponse.json(await checkHandwrittenWork(base64, mimeType));
  } catch (error) {
    console.error(
      "Check-work request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "We could not review that work. Try a clearer, flatter photo." },
      { status: 500 },
    );
  }
}

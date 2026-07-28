import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/captcha";

const CATEGORIES = new Set([
  "wrong_answer",
  "unclear_step",
  "formatting",
  "ocr_mismatch",
  "other",
]);

export async function POST(request: Request) {
  const validation = await validateRequest(request);
  if (!validation.allowed) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status },
    );
  }
  const { category, reviewStatus, client } = validation.body as {
    category?: unknown;
    reviewStatus?: unknown;
    client?: unknown;
  };
  if (typeof category !== "string" || !CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "Choose a valid feedback category." },
      { status: 400 },
    );
  }

  // Deliberately log only low-cardinality metadata. Problem text, solutions,
  // identity, images, and notebook IDs never enter this feedback channel.
  console.info("solution_feedback", {
    category,
    reviewStatus:
      reviewStatus === "checked" ||
      reviewStatus === "warning" ||
      reviewStatus === "inconclusive"
        ? reviewStatus
        : "not_reviewed",
    client: client === "mobile" ? "mobile" : "web",
  });
  return NextResponse.json({ accepted: true });
}

import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/captcha";
import { verifyCompletedSolution } from "@/lib/math-review";

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }
    const { problem, solution } = validation.body as {
      problem?: unknown;
      solution?: unknown;
    };
    if (
      typeof problem !== "string" ||
      typeof solution !== "string" ||
      problem.trim().length === 0 ||
      problem.length > 20_000 ||
      solution.trim().length === 0 ||
      solution.length > 60_000
    ) {
      return NextResponse.json(
        { error: "A completed problem and solution are required." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await verifyCompletedSolution(problem.trim(), solution.trim()),
    );
  } catch (error) {
    console.error(
      "Solution verification failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      {
        status: "inconclusive",
        confidence: 0,
        summary: "The independent AI review is unavailable right now.",
        finalAnswer: null,
        issues: [],
      },
      { status: 503 },
    );
  }
}

"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function BlogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground">
          The blog is temporarily unavailable
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We could not load the latest articles. Try again in a moment or
          return to the solver.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl border border-black/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            Back to MathSolver
          </Link>
        </div>
      </div>
    </main>
  );
}

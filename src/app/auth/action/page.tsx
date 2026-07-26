import type { Metadata } from "next";
import { Suspense } from "react";
import AuthActionHandler from "@/components/auth/AuthActionHandler";

export const metadata: Metadata = {
  title: "Account action | MathSolver",
  description: "Complete a MathSolver account action.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthActionPage() {
  return (
    <Suspense fallback={<AuthActionLoading />}>
      <AuthActionHandler />
    </Suspense>
  );
}

function AuthActionLoading() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        <p className="mt-4 text-sm text-muted-foreground">
          Opening your secure account link…
        </p>
      </div>
    </div>
  );
}

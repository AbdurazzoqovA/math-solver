"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  getIdToken,
  reload,
  verifyPasswordResetCode,
} from "firebase/auth";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getFirebaseClient } from "@/lib/firebase-client";
import {
  getSafeAuthContinueUrl,
  isFirebaseAuthActionMode,
  type FirebaseAuthActionMode,
} from "@/lib/firebase-auth-actions";

type ActionStatus = "working" | "reset-ready" | "success" | "error";

function getActionErrorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  if (
    code === "auth/expired-action-code" ||
    code === "auth/invalid-action-code"
  ) {
    return "This account link has expired or was already used. Request a new email from MathSolver.";
  }
  if (code === "auth/user-disabled") {
    return "This account is disabled. Contact MathSolver support.";
  }
  if (code === "auth/weak-password") {
    return "Use a stronger password with at least 6 characters.";
  }
  return "We could not complete this account action. Request a new email and try again.";
}

function getActionCopy(mode: FirebaseAuthActionMode | null) {
  if (mode === "resetPassword") {
    return {
      title: "Choose a new password",
      description: "Secure your MathSolver account with a new password.",
    };
  }
  if (mode === "recoverEmail") {
    return {
      title: "Restore your email",
      description: "We’re restoring the previous email on your account.",
    };
  }
  return {
    title: "Verify your email",
    description: "Activating secure notebook sync for your MathSolver account.",
  };
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "";
  return `${localPart.slice(0, 1)}***@${domain}`;
}

export default function AuthActionHandler() {
  const searchParams = useSearchParams();
  const modeValue = searchParams.get("mode");
  const mode = isFirebaseAuthActionMode(modeValue) ? modeValue : null;
  const oobCode = searchParams.get("oobCode");
  const continueUrl = getSafeAuthContinueUrl(
    searchParams.get("continueUrl"),
    typeof window === "undefined" ? "https://math-solver.io" : window.location.origin,
  );
  const [status, setStatus] = useState<ActionStatus>("working");
  const [message, setMessage] = useState("Checking your secure link…");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStarted = useRef(false);
  const copy = getActionCopy(mode);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const handleAction = async () => {
      const client = getFirebaseClient();
      if (!client || !mode || !oobCode) {
        setStatus("error");
        setMessage(
          "This account link is incomplete. Request a new email from MathSolver.",
        );
        return;
      }

      try {
        if (mode === "resetPassword") {
          const email = await verifyPasswordResetCode(client.auth, oobCode);
          setAccountEmail(email);
          setStatus("reset-ready");
          setMessage("Enter a new password for your account.");
          return;
        }

        await checkActionCode(client.auth, oobCode);
        await applyActionCode(client.auth, oobCode);

        if (client.auth.currentUser) {
          await reload(client.auth.currentUser);
          await getIdToken(client.auth.currentUser, true);
        }

        setStatus("success");
        setMessage(
          mode === "verifyEmail"
            ? "Email verified. Opening your MathSolver notebook…"
            : "Your account email has been restored. Returning to MathSolver…",
        );
        window.setTimeout(() => window.location.replace(continueUrl), 900);
      } catch (error) {
        setStatus("error");
        setMessage(getActionErrorMessage(error));
      }
    };

    void handleAction();
  }, [continueUrl, mode, oobCode]);

  const handlePasswordReset = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const client = getFirebaseClient();
    if (!client || !oobCode) {
      setStatus("error");
      setMessage("This password reset link is incomplete.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(client.auth, oobCode, password);
      setStatus("success");
      setMessage(
        "Password updated. Returning to MathSolver so you can sign in…",
      );
      window.setTimeout(() => window.location.replace(continueUrl), 900);
    } catch (error) {
      setStatus("error");
      setMessage(getActionErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-zinc-950">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            M
          </span>
          MathSolver
        </Link>

        <div className="mt-8 text-center">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              status === "error"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : status === "success"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
            }`}
          >
            {status === "working" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : status === "error" ? (
              <TriangleAlert className="h-7 w-7" />
            ) : status === "success" ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : mode === "resetPassword" ? (
              <KeyRound className="h-7 w-7" />
            ) : (
              <ShieldCheck className="h-7 w-7" />
            )}
          </span>

          <h1 className="mt-5 text-2xl font-bold">{copy.title}</h1>
          <p
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
            role={status === "error" ? "alert" : "status"}
          >
            {status === "working" ? copy.description : message}
          </p>
        </div>

        {status === "reset-ready" && (
          <form onSubmit={handlePasswordReset} className="mt-6 space-y-3">
            {accountEmail && (
              <p className="truncate text-center text-xs text-muted-foreground">
                {maskEmail(accountEmail)}
              </p>
            )}
            <label className="block">
              <span className="sr-only">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}

        {status === "error" && (
          <Link
            href="/"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Return to MathSolver
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Account links are single-use. MathSolver will never ask for your
          existing password on this page.
        </p>
      </section>
    </div>
  );
}

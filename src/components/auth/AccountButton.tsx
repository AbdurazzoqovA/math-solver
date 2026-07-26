"use client";

import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Check,
  Cloud,
  CloudOff,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MailCheck,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatContext } from "@/context/ChatContext";

type AuthMode = "sign-in" | "create" | "reset" | "verify";

export default function AccountButton({
  isExpanded,
}: {
  isExpanded: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    user,
    isAuthReady,
    isSigningIn,
    isFirebaseEnabled,
    isEmailVerified,
    canSyncNotebook,
    authError,
    authNotice,
    signInWithGoogle,
    signInWithEmail,
    createAccountWithEmail,
    resendVerificationEmail,
    refreshEmailVerification,
    sendPasswordReset,
    signOut,
    clearAuthFeedback,
  } = useAuth();
  const { cloudSyncState } = useChatContext();

  if (!isFirebaseEnabled) return null;

  const displayName = user?.displayName || user?.email || "Your account";
  const needsVerification = !!user && !canSyncNotebook;
  const syncLabel =
    cloudSyncState === "synced"
      ? "Notebook synced"
      : cloudSyncState === "syncing"
        ? "Syncing notebook…"
        : cloudSyncState === "verification-required"
          ? "Verify email to sync"
          : cloudSyncState === "error"
            ? "Sync needs attention"
            : "Saved on this device";

  const openDialog = (mode: AuthMode) => {
    clearAuthFeedback();
    setAuthMode(mode);
    setIsMenuOpen(false);
    setIsAuthDialogOpen(true);
  };

  const closeDialog = () => {
    setIsAuthDialogOpen(false);
    setPassword("");
  };

  const handleMainClick = () => {
    clearAuthFeedback();
    if (needsVerification) {
      openDialog("verify");
    } else if (user) {
      setIsMenuOpen((open) => !open);
    } else {
      openDialog("sign-in");
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAuthFeedback();

    if (authMode === "reset") {
      await sendPasswordReset(email);
      return;
    }

    const result =
      authMode === "create"
        ? await createAccountWithEmail(email, password)
        : await signInWithEmail(email, password);
    setPassword("");

    if (result === "verified") {
      closeDialog();
    } else if (result === "verification-required") {
      setAuthMode("verify");
    }
  };

  const dialogTitle =
    authMode === "create"
      ? "Create your account"
      : authMode === "reset"
        ? "Reset your password"
        : authMode === "verify"
          ? "Verify your email"
          : "Sync your notebook";

  const feedback = (
    <>
      {authNotice && (
        <p
          className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {authNotice}
        </p>
      )}
      {authError && (
        <p
          className="text-sm leading-relaxed text-amber-600 dark:text-amber-400"
          role="alert"
        >
          {authError}
        </p>
      )}
    </>
  );

  const authDialog =
    isAuthDialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
          >
            <button
              type="button"
              aria-label="Close account dialog"
              onClick={closeDialog}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
              <button
                type="button"
                onClick={closeDialog}
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pr-8">
                <h2
                  id="account-dialog-title"
                  className="text-xl font-bold text-foreground"
                >
                  {dialogTitle}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {authMode === "verify"
                    ? `We sent an activation link to ${user?.email ?? email}. Cloud sync starts after verification.`
                    : authMode === "reset"
                      ? "Enter your email and we’ll send a secure reset link."
                      : "Keep solved problems and practice history across devices. Guest mode always stays available."}
                </p>
              </div>

              {authMode === "verify" ? (
                <div className="mt-6 space-y-3">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-primary-100 p-4 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                      <MailCheck className="h-7 w-7" />
                    </span>
                  </div>
                  {feedback}
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={async () => {
                      const verified = await refreshEmailVerification();
                      if (verified) closeDialog();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {isSigningIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    I’ve verified my email
                  </button>
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={() => void resendVerificationEmail()}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold text-foreground hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    Resend verification email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      closeDialog();
                      await signOut();
                    }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Use a different account
                  </button>
                </div>
              ) : (
                <>
                  {authMode !== "reset" && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          clearAuthFeedback();
                          const succeeded = await signInWithGoogle();
                          if (succeeded) closeDialog();
                        }}
                        disabled={isSigningIn}
                        aria-label="Sign in with Google"
                        className="relative mx-auto mt-6 block h-10 w-[177px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Image
                          src="https://developers.google.com/static/identity/gsi/web/images/standard-button-white.png"
                          alt=""
                          width={177}
                          height={40}
                          className="h-10 w-[177px]"
                        />
                        {isSigningIn && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-white/80 text-[#1f1f1f]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </span>
                        )}
                      </button>

                      <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          or
                        </span>
                        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                      </div>
                    </>
                  )}

                  <form
                    onSubmit={handleEmailSubmit}
                    className={authMode === "reset" ? "mt-6 space-y-3" : "space-y-3"}
                  >
                    <label className="relative block">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <span className="sr-only">Email address</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email address"
                        className="w-full rounded-xl border border-black/10 bg-transparent py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10"
                      />
                    </label>
                    {authMode !== "reset" && (
                      <label className="relative block">
                        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <span className="sr-only">Password</span>
                        <input
                          type="password"
                          autoComplete={
                            authMode === "create"
                              ? "new-password"
                              : "current-password"
                          }
                          required
                          minLength={6}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Password"
                          className="w-full rounded-xl border border-black/10 bg-transparent py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10"
                        />
                      </label>
                    )}

                    {feedback}

                    <button
                      type="submit"
                      disabled={isSigningIn}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      {isSigningIn && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {authMode === "create"
                        ? "Create account"
                        : authMode === "reset"
                          ? "Send reset link"
                          : "Sign in with email"}
                    </button>
                  </form>

                  {authMode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthFeedback();
                        setAuthMode("reset");
                      }}
                      className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      Forgot your password?
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      clearAuthFeedback();
                      setAuthMode(
                        authMode === "create" ? "sign-in" : authMode === "reset" ? "sign-in" : "create",
                      );
                    }}
                    className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    {authMode === "create"
                      ? "Already have an account? Sign in"
                      : authMode === "reset"
                        ? "Back to sign in"
                        : "New to MathSolver? Create an account"}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        {user && isMenuOpen && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-60 rounded-2xl border border-black/10 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            {user.email && user.displayName && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {isEmailVerified ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Mail className="h-3.5 w-3.5 text-amber-500" />
              )}
              {isEmailVerified ? "Verified account" : "Verification pending"}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {cloudSyncState === "synced" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : cloudSyncState === "error" ? (
                <CloudOff className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-primary-500" />
              )}
              {syncLabel}
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsMenuOpen(false);
                await signOut();
              }}
              className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleMainClick}
          disabled={!isAuthReady || isSigningIn}
          className={`group flex w-full items-center rounded-xl p-3 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-60 dark:hover:bg-white/5 ${
            isExpanded ? "justify-start gap-3 px-4" : "justify-center"
          }`}
          title={user ? syncLabel : "Sign in to sync your notebook"}
        >
          {isSigningIn || !isAuthReady ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : user ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <UserRound className="h-5 w-5 shrink-0 transition-colors group-hover:text-primary-500" />
          )}
          {isExpanded && (
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium">
                {user ? displayName : "Sign in to sync"}
              </span>
              {user && (
                <span className="block truncate text-[11px] text-muted-foreground/70">
                  {syncLabel}
                </span>
              )}
            </span>
          )}
        </button>

        {authError && isExpanded && (
          <p className="px-4 pt-1 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
            {authError}
          </p>
        )}
        {authNotice && isExpanded && (
          <p
            className="px-4 pt-1 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            {authNotice}
          </p>
        )}
      </div>
      {authDialog}
    </>
  );
}

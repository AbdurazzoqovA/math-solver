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
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatContext } from "@/context/ChatContext";

export default function AccountButton({
  isExpanded,
}: {
  isExpanded: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    user,
    isAuthReady,
    isSigningIn,
    isFirebaseEnabled,
    authError,
    signInWithGoogle,
    signInWithEmail,
    createAccountWithEmail,
    signOut,
    clearAuthError,
  } = useAuth();
  const { cloudSyncState } = useChatContext();

  if (!isFirebaseEnabled) return null;

  const displayName = user?.displayName || user?.email || "Your account";
  const syncLabel =
    cloudSyncState === "synced"
      ? "Notebook synced"
      : cloudSyncState === "syncing"
        ? "Syncing notebook…"
        : cloudSyncState === "error"
          ? "Sync needs attention"
          : "Saved on this device";

  const handleMainClick = () => {
    clearAuthError();
    if (user) {
      setIsMenuOpen((open) => !open);
      return;
    }
    setIsAuthDialogOpen(true);
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAuthError();
    const succeeded = isCreatingAccount
      ? await createAccountWithEmail(email, password)
      : await signInWithEmail(email, password);
    if (succeeded) {
      setIsAuthDialogOpen(false);
      setEmail("");
      setPassword("");
    }
  };

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
              onClick={() => setIsAuthDialogOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-sm rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setIsAuthDialogOpen(false)}
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
                  {isCreatingAccount ? "Create your account" : "Sync your notebook"}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Keep your solved problems and practice history across devices.
                  You can still use MathSolver without signing in.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  clearAuthError();
                  const succeeded = await signInWithGoogle();
                  if (succeeded) {
                    setIsAuthDialogOpen(false);
                    setEmail("");
                    setPassword("");
                  }
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

              <form onSubmit={handleEmailSubmit} className="space-y-3">
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
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <label className="relative block">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <span className="sr-only">Password</span>
                  <input
                    type="password"
                    autoComplete={
                      isCreatingAccount ? "new-password" : "current-password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>

                {authError && (
                  <p className="text-sm leading-relaxed text-amber-600 dark:text-amber-400">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {isSigningIn && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isCreatingAccount ? "Create account" : "Sign in with email"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  setIsCreatingAccount((creating) => !creating);
                }}
                className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {isCreatingAccount
                  ? "Already have an account? Sign in"
                  : "New to MathSolver? Create an account"}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative">
        {user && isMenuOpen && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-60 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 shadow-xl z-50">
            <p className="font-semibold text-sm text-foreground truncate">
              {displayName}
            </p>
            {user.email && user.displayName && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {cloudSyncState === "synced" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : cloudSyncState === "error" ? (
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-primary-500" />
              )}
              {syncLabel}
            </div>
            <button
              onClick={async () => {
                setIsMenuOpen(false);
                await signOut();
              }}
              className="mt-3 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}

        <button
          onClick={handleMainClick}
          disabled={!isAuthReady || isSigningIn}
          className={`w-full flex items-center p-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group disabled:opacity-60 ${
            isExpanded ? "justify-start px-4 gap-3" : "justify-center"
          }`}
          title={user ? syncLabel : "Sign in to sync your notebook"}
        >
          {isSigningIn || !isAuthReady ? (
            <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          ) : user ? (
            <span className="w-6 h-6 shrink-0 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <UserRound className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" />
          )}
          {isExpanded && (
            <span className="min-w-0 text-left">
              <span className="block font-medium text-sm truncate">
                {user ? displayName : "Sign in to sync"}
              </span>
              {user && (
                <span className="block text-[11px] text-muted-foreground/70 truncate">
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
      </div>
      {authDialog}
    </>
  );
}

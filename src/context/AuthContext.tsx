"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type ActionCodeSettings,
  createUserWithEmailAndPassword,
  getIdToken,
  GoogleAuthProvider,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  getFirebaseClient,
  isFirebaseConfigured,
} from "@/lib/firebase-client";

export type EmailAuthResult =
  | "verified"
  | "verification-required"
  | "failed";

type AuthContextValue = {
  user: User | null;
  isAuthReady: boolean;
  isSigningIn: boolean;
  isFirebaseEnabled: boolean;
  isEmailVerified: boolean;
  canSyncNotebook: boolean;
  authError: string | null;
  authNotice: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<EmailAuthResult>;
  createAccountWithEmail: (
    email: string,
    password: string,
  ) => Promise<EmailAuthResult>;
  resendVerificationEmail: () => Promise<boolean>;
  refreshEmailVerification: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  getAuthToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  clearAuthFeedback: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "We could not connect your account. Please try again.";
  }

  switch (error.code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was canceled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    case "auth/unauthorized-domain":
      return "Account sync is not enabled for this domain yet.";
    case "auth/network-request-failed":
      return "Check your connection and try signing in again.";
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/account-exists-with-different-credential":
      return "This email uses a different sign-in method. Try Google sign-in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/requires-recent-login":
      return "Please sign in again before continuing.";
    default:
      return "We could not connect your account. Please try again.";
  }
}

function isPasswordAccount(user: User) {
  return user.providerData.some(
    (provider) => provider.providerId === "password",
  );
}

function getActionCodeSettings(kind: "verify" | "reset"): ActionCodeSettings {
  // Firebase's email-template Action URL controls the first destination
  // (/auth/action). This value is the same-origin return state used after the
  // custom handler applies the one-time code.
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set(
    "auth",
    kind === "verify" ? "verified" : "password-reset",
  );
  url.hash = "";

  return {
    url: url.toString(),
    handleCodeInApp: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(!isFirebaseConfigured);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      setIsAuthReady(true);
      return;
    }

    return onIdTokenChanged(
      client.auth,
      (nextUser) => {
        setUser(nextUser);
        setIsEmailVerified(nextUser?.emailVerified ?? false);
        setIsAuthReady(true);
      },
      () => {
        setAuthError("Account sync is temporarily unavailable.");
        setIsAuthReady(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!isAuthReady || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const returnState = url.searchParams.get("auth");
    if (!returnState) return;

    const finishReturn = async () => {
      if (returnState === "verified") {
        const client = getFirebaseClient();
        if (client?.auth.currentUser) {
          try {
            await reload(client.auth.currentUser);
            await getIdToken(client.auth.currentUser, true);
            setUser(client.auth.currentUser);
            setIsEmailVerified(client.auth.currentUser.emailVerified);
            setAuthNotice(
              client.auth.currentUser.emailVerified
                ? "Email verified. Your notebook can now sync."
                : "Verification is still pending. Open the newest verification email and try again.",
            );
          } catch {
            setAuthError(
              "We could not refresh your verification status. Please try again.",
            );
          }
        } else {
          setAuthNotice(
            "Email verified. Sign in to start syncing your notebook.",
          );
        }
      } else if (returnState === "password-reset") {
        setAuthNotice("Password updated. Sign in with your new password.");
      }

      url.searchParams.delete("auth");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    };

    void finishReturn();
  }, [isAuthReady]);

  const signInWithGoogle = useCallback(async () => {
    const client = getFirebaseClient();
    if (!client) {
      setAuthError("Firebase account sync has not been configured.");
      return false;
    }

    setIsSigningIn(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await signInWithPopup(client.auth, new GoogleAuthProvider());
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const client = getFirebaseClient();
      if (!client) {
        setAuthError("Firebase account sync has not been configured.");
        return "failed";
      }

      setIsSigningIn(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const credential = await signInWithEmailAndPassword(
          client.auth,
          email.trim(),
          password,
        );
        setUser(credential.user);
        setIsEmailVerified(credential.user.emailVerified);
        if (
          isPasswordAccount(credential.user) &&
          !credential.user.emailVerified
        ) {
          setAuthNotice(
            "Verify your email before cloud notebook sync is enabled.",
          );
          return "verification-required";
        }
        return "verified";
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
        return "failed";
      } finally {
        setIsSigningIn(false);
      }
    },
    [],
  );

  const createAccountWithEmail = useCallback(
    async (email: string, password: string) => {
      const client = getFirebaseClient();
      if (!client) {
        setAuthError("Firebase account sync has not been configured.");
        return "failed";
      }

      setIsSigningIn(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const credential = await createUserWithEmailAndPassword(
          client.auth,
          email.trim(),
          password,
        );
        await sendEmailVerification(
          credential.user,
          getActionCodeSettings("verify"),
        );
        setUser(credential.user);
        setIsEmailVerified(credential.user.emailVerified);
        setAuthNotice(
          "Verification email sent. Open it to activate cloud notebook sync.",
        );
        return "verification-required";
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
        return "failed";
      } finally {
        setIsSigningIn(false);
      }
    },
    [],
  );

  const resendVerificationEmail = useCallback(async () => {
    const client = getFirebaseClient();
    const currentUser = client?.auth.currentUser;
    if (!currentUser || !isPasswordAccount(currentUser)) {
      setAuthError("Sign in with your email account to resend verification.");
      return false;
    }

    setIsSigningIn(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendEmailVerification(
        currentUser,
        getActionCodeSettings("verify"),
      );
      setAuthNotice(
        "Verification email sent. If it is not in your inbox, check spam.",
      );
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    const client = getFirebaseClient();
    const currentUser = client?.auth.currentUser;
    if (!currentUser) {
      setAuthError("Sign in again to check your verification status.");
      return false;
    }

    setIsSigningIn(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await reload(currentUser);
      await getIdToken(currentUser, true);
      setUser(currentUser);
      setIsEmailVerified(currentUser.emailVerified);
      if (!currentUser.emailVerified) {
        setAuthNotice(
          "Verification is still pending. Open the newest verification email and try again.",
        );
        return false;
      }
      setAuthNotice("Email verified. Your notebook can now sync.");
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const client = getFirebaseClient();
    if (!client) {
      setAuthError("Firebase account sync has not been configured.");
      return false;
    }

    setIsSigningIn(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendPasswordResetEmail(
        client.auth,
        email.trim(),
        getActionCodeSettings("reset"),
      );
      setAuthNotice(
        "If an account exists for that email, a password reset link is on its way.",
      );
      return true;
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        error.code === "auth/user-not-found"
      ) {
        setAuthNotice(
          "If an account exists for that email, a password reset link is on its way.",
        );
        return true;
      }
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = getFirebaseClient();
    if (!client) return;

    setAuthError(null);
    setAuthNotice(null);
    try {
      await firebaseSignOut(client.auth);
    } catch {
      setAuthError("We could not sign you out. Please try again.");
    }
  }, []);

  const getAuthToken = useCallback(async () => {
    const client = getFirebaseClient();
    const currentUser = client?.auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) return null;
    try {
      return await getIdToken(currentUser);
    } catch {
      setAuthError("Your session could not be verified. Sign in again.");
      return null;
    }
  }, []);

  const clearAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const canSyncNotebook =
    !!user && (!isPasswordAccount(user) || isEmailVerified);

  const value = useMemo(
    () => ({
      user,
      isAuthReady,
      isSigningIn,
      isFirebaseEnabled: isFirebaseConfigured,
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
      getAuthToken,
      signOut,
      clearAuthFeedback,
    }),
    [
      authError,
      authNotice,
      canSyncNotebook,
      clearAuthFeedback,
      createAccountWithEmail,
      isAuthReady,
      isEmailVerified,
      isSigningIn,
      refreshEmailVerification,
      resendVerificationEmail,
      sendPasswordReset,
      getAuthToken,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

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
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
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

type AuthContextValue = {
  user: User | null;
  isAuthReady: boolean;
  isSigningIn: boolean;
  isFirebaseEnabled: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  createAccountWithEmail: (
    email: string,
    password: string,
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
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
    default:
      return "We could not connect your account. Please try again.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!isFirebaseConfigured);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      setIsAuthReady(true);
      return;
    }

    return onAuthStateChanged(
      client.auth,
      (nextUser) => {
        setUser(nextUser);
        setIsAuthReady(true);
      },
      () => {
        setAuthError("Account sync is temporarily unavailable.");
        setIsAuthReady(true);
      },
    );
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const client = getFirebaseClient();
    if (!client) {
      setAuthError("Firebase account sync has not been configured.");
      return false;
    }

    setIsSigningIn(true);
    setAuthError(null);
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
        return false;
      }

      setIsSigningIn(true);
      setAuthError(null);
      try {
        await signInWithEmailAndPassword(
          client.auth,
          email.trim(),
          password,
        );
        return true;
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
        return false;
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
        return false;
      }

      setIsSigningIn(true);
      setAuthError(null);
      try {
        await createUserWithEmailAndPassword(
          client.auth,
          email.trim(),
          password,
        );
        return true;
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
        return false;
      } finally {
        setIsSigningIn(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const client = getFirebaseClient();
    if (!client) return;

    setAuthError(null);
    try {
      await firebaseSignOut(client.auth);
    } catch {
      setAuthError("We could not sign you out. Please try again.");
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo(
    () => ({
      user,
      isAuthReady,
      isSigningIn,
      isFirebaseEnabled: isFirebaseConfigured,
      authError,
      signInWithGoogle,
      signInWithEmail,
      createAccountWithEmail,
      signOut,
      clearAuthError,
    }),
    [
      authError,
      clearAuthError,
      createAccountWithEmail,
      isAuthReady,
      isSigningIn,
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

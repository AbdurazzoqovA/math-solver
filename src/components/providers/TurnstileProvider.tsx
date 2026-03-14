"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

interface TurnstileContextType {
  /** Returns the current Turnstile token, or null if unavailable (ad blocker, script error, etc.) */
  getToken: () => string | null;
}

const TurnstileContext = createContext<TurnstileContextType>({
  getToken: () => null,
});

export function useTurnstile() {
  return useContext(TurnstileContext);
}

// ── Extend window for Turnstile API ────────────────────────────────

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
          retry?: "auto" | "never";
          "retry-interval"?: number;
          "refresh-expired"?: "auto" | "manual" | "never";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

// ── Provider ───────────────────────────────────────────────────────

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__turnstileOnLoad";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT_LOAD_TIMEOUT_MS = 10_000;

export default function TurnstileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tokenRef = useRef<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const scriptFailedRef = useRef(false);

  // ── Load script ──────────────────────────────────────────────────
  useEffect(() => {
    if (!SITE_KEY) {
      // No site key configured (dev mode) → skip entirely
      scriptFailedRef.current = true;
      return;
    }

    // If script is already loaded
    if (window.turnstile) {
      setScriptReady(true);
      return;
    }

    // Set up global callback for explicit render mode
    (window as unknown as Record<string, unknown>).__turnstileOnLoad = () => {
      setScriptReady(true);
    };

    // Check if the script tag already exists (e.g. from a previous render)
    const existingScript = document.querySelector(
      `script[src^="https://challenges.cloudflare.com/turnstile"]`
    );
    if (existingScript) {
      // Script tag exists but hasn't loaded yet — just wait
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      // Ad blocker or network error — graceful fallback
      scriptFailedRef.current = true;
    };

    document.head.appendChild(script);

    // Timeout fallback in case the script hangs
    const timeout = setTimeout(() => {
      if (!window.turnstile) {
        scriptFailedRef.current = true;
      }
    }, SCRIPT_LOAD_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  // ── Render invisible widget once script is ready ─────────────────
  useEffect(() => {
    if (!scriptReady || !window.turnstile || !containerRef.current || !SITE_KEY)
      return;

    // Don't render twice
    if (widgetIdRef.current) return;

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        size: "invisible",
        appearance: "interaction-only",
        retry: "auto",
        "retry-interval": 5000,
        "refresh-expired": "auto",
        callback: (token: string) => {
          tokenRef.current = token;
        },
        "error-callback": () => {
          tokenRef.current = null;
        },
        "expired-callback": () => {
          tokenRef.current = null;
          // Auto-refresh: reset the widget to get a new token
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              // Widget might have been removed
            }
          }
        },
        "timeout-callback": () => {
          tokenRef.current = null;
        },
      });
      widgetIdRef.current = id;
    } catch {
      // Widget render failed — graceful fallback
      scriptFailedRef.current = true;
    }
  }, [scriptReady]);

  // ── getToken: returns current token and auto-resets for next call ─
  const getToken = useCallback((): string | null => {
    if (scriptFailedRef.current || !SITE_KEY) {
      return null;
    }

    const token = tokenRef.current;

    // Reset the widget to generate a fresh token for the next request
    // (Turnstile tokens are single-use)
    if (widgetIdRef.current && window.turnstile) {
      try {
        // Clear current token immediately so concurrent calls don't reuse it
        tokenRef.current = null;
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Ignore reset errors
      }
    }

    return token;
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return (
    <TurnstileContext.Provider value={{ getToken }}>
      {children}
      {/* Container for the Turnstile widget */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "1rem",
          zIndex: 9999,
        }}
        aria-hidden="true"
      />
    </TurnstileContext.Provider>
  );
}

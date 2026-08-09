"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";

const CONSENT_KEY = "mathsolver.analytics-consent.v1";

type Consent = "granted" | "denied" | null;

function getConsent(): Consent {
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "granted" || stored === "denied" ? stored : null;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("mathsolver-analytics-consent", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("mathsolver-analytics-consent", onChange);
  };
}

export default function AnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, getConsent, () => null);

  function choose(value: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event("mathsolver-analytics-consent"));
  }

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-YG1NPYM8BS"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', 'G-YG1NPYM8BS', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}
      {consent === null && (
        <aside
          aria-label="Analytics choice"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-border bg-background p-4 shadow-2xl"
        >
          <p className="text-sm font-semibold text-foreground">
            Help improve MathSolver?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Allow anonymous website analytics. We never include your math,
            photos, answers, or account details.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => choose("denied")}
            >
              No thanks
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => choose("granted")}
            >
              Allow analytics
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

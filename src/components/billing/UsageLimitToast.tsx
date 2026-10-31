"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  USAGE_LIMIT_EVENT,
  type UsageLimitDetail,
} from "@/lib/billing/limits";
import { trackEvent } from "@/lib/analytics";

const AUTO_DISMISS_MS = 15_000;

// Shown when /api/ocr or /api/practice answers 429 daily_limit_reached. The
// chat inputs dispatch the event; this single toast owns the upgrade prompt.
export default function UsageLimitToast() {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<UsageLimitDetail | null>(null);

  useEffect(() => {
    const onLimit = (event: Event) => {
      const next = (event as CustomEvent<UsageLimitDetail>).detail;
      if (!next) return;
      setDetail(next);
      trackEvent("usage_limit_reached", {
        feature: next.feature,
        tier: next.tier,
      });
    };
    window.addEventListener(USAGE_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(USAGE_LIMIT_EVENT, onLimit);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const timer = window.setTimeout(() => setDetail(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [detail]);

  if (!detail) return null;

  const message =
    detail.feature === "scans"
      ? t("scanLimitReached", { limit: detail.limit })
      : t("quizLimitReached", { limit: detail.limit });

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1 text-sm">
          <p className="text-foreground">{message}</p>
          {detail.tier !== "unlimited" && (
            <Link
              href="/pricing"
              onClick={() => setDetail(null)}
              className="mt-1.5 inline-flex font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              {t("seePlans")}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

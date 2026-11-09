"use client";

import { useEffect, useRef, useState } from "react";
import { useBilling } from "@/context/BillingContext";
import { useLanguage } from "@/context/LanguageContext";

// Publisher id of the AdSense loader in src/app/[locale]/layout.tsx.
const ADSENSE_CLIENT = "ca-pub-5558010343849231";

// Ad units created for math-solver.io in the AdSense dashboard (Ads → By ad
// unit). One unit per placement keeps per-placement revenue visible in reports.
const AD_UNITS = {
  solution: { slot: "4435084272", kind: "display" }, // under the latest finished answer
  landing: { slot: "7172928255", kind: "display" }, // homepages and hub/listing pages
  calculator: { slot: "5189103609", kind: "display" }, // inside calculator guides
  article: { slot: "1831157573", kind: "inArticle" }, // inside blog articles
  multiplex: { slot: "3233683249", kind: "multiplex" }, // end of guides and articles
} as const;

export type AdPlacement = keyof typeof AD_UNITS;

type AdStatus = "pending" | "filled" | "unfilled";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A manually placed AdSense unit. Paying subscribers never see ads, and the
 * slot renders nothing until the plan is known so a paid account never
 * flashes one. While an ad is loading, or when an ad blocker stops the
 * loader, the slot takes no space; an unfilled slot is removed.
 */
export default function AdSlot({
  placement,
  className = "",
  spacing = "",
}: {
  placement: AdPlacement;
  /** Always applied (width, centering). */
  className?: string;
  /** Applied only once an ad has filled, e.g. "mt-12", so an empty slot adds no gap. */
  spacing?: string;
}) {
  const { tier, isPlanLoaded } = useBilling();
  if (!isPlanLoaded || tier !== "free") return null;
  return (
    <AdUnit placement={placement} className={className} spacing={spacing} />
  );
}

function AdUnit({
  placement,
  className,
  spacing,
}: {
  placement: AdPlacement;
  className: string;
  spacing: string;
}) {
  const { t } = useLanguage();
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const [status, setStatus] = useState<AdStatus>("pending");
  const unit = AD_UNITS[placement];

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;

    // AdSense reports the result on the element as data-ad-status.
    const readStatus = () => {
      const value = ins.getAttribute("data-ad-status");
      if (value === "filled" || value === "unfilled") setStatus(value);
    };
    const observer = new MutationObserver(readStatus);
    observer.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    // StrictMode runs effects twice on one element; request the ad once.
    const requestAd = () => {
      if (pushedRef.current || ins.getAttribute("data-adsbygoogle-status")) {
        return;
      }
      pushedRef.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // A blocked or failed loader must never break the page.
      }
    };

    // AdSense cannot size a responsive unit with no width ("availableWidth=0"),
    // e.g. while a resizable panel is still laying out; wait until it has one.
    let resizeObserver: ResizeObserver | null = null;
    if (ins.offsetWidth > 0) {
      requestAd();
    } else {
      resizeObserver = new ResizeObserver(() => {
        if (ins.offsetWidth === 0) return;
        resizeObserver?.disconnect();
        requestAd();
      });
      resizeObserver.observe(ins);
    }

    readStatus();
    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
    };
  }, []);

  const formatProps =
    unit.kind === "inArticle"
      ? {
          "data-ad-layout": "in-article",
          "data-ad-format": "fluid",
        }
      : unit.kind === "multiplex"
        ? { "data-ad-format": "autorelaxed" }
        : {
            "data-ad-format": "auto",
            "data-full-width-responsive": "true",
          };

  return (
    <aside
      aria-label={t("advertisement")}
      data-ad-placement={placement}
      className={
        status === "unfilled"
          ? "hidden"
          : `w-full ${className} ${status === "filled" ? spacing : ""}`
      }
    >
      {status === "filled" && (
        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          {t("advertisement")}
        </p>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{
          display: "block",
          textAlign: unit.kind === "inArticle" ? "center" : undefined,
        }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={unit.slot}
        {...(process.env.NODE_ENV !== "production"
          ? { "data-adtest": "on" }
          : {})}
        {...formatProps}
      />
    </aside>
  );
}

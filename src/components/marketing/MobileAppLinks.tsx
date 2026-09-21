"use client";

import { Apple } from "lucide-react";
import clsx from "clsx";
import { trackEvent } from "@/lib/analytics";
import { MOBILE_APP_STORES, type MobileAppPlatform } from "@/lib/mobile-apps";

type MobileAppLinksProps = {
  placement: "homepage_hero" | "homepage_mobile_section";
  className?: string;
};

function GooglePlayMark() {
  return (
    <svg
      viewBox="0 0 34 38"
      className="h-7 w-7 shrink-0"
      aria-hidden="true"
    >
      <path fill="#00d17e" d="M2.6 2.2 20.3 19 2.7 35.8a4 4 0 0 1-.7-2.3V4.6c0-.9.2-1.7.6-2.4Z" />
      <path fill="#00a7f7" d="m20.3 19 5.3-5.1L7.5 3.5a8 8 0 0 0-4.9-1.3L20.3 19Z" />
      <path fill="#ffca28" d="m20.3 19 5.3 5.1L7.3 34.7a8 8 0 0 1-4.6 1.1L20.3 19Z" />
      <path fill="#ff4b55" d="m25.6 13.9 5.2 3c1.7 1 1.7 3.1 0 4.1l-5.2 3.1-5.3-5.1 5.3-5.1Z" />
    </svg>
  );
}

const storeButtons: Array<{
  platform: MobileAppPlatform;
  eyebrow: string;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    platform: "ios",
    eyebrow: "Download on the",
    label: "App Store",
    icon: <Apple className="h-7 w-7 shrink-0" strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    platform: "android",
    eyebrow: "Get it on",
    label: "Google Play",
    icon: <GooglePlayMark />,
  },
];

export default function MobileAppLinks({
  placement,
  className,
}: MobileAppLinksProps) {
  return (
    <div className={clsx("flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row", className)}>
      {storeButtons.map(({ platform, eyebrow, label, icon }) => {
        const store = MOBILE_APP_STORES[platform];

        return (
          <a
            key={platform}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download MathSolver from ${store.name} (opens in a new tab)`}
            onClick={() =>
              trackEvent("mobile_app_store_click", {
                platform,
                placement,
              })
            }
            className="group flex h-[54px] w-full max-w-[230px] items-center justify-center gap-3 rounded-xl border border-white/15 bg-zinc-950 px-4 text-left text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-0 sm:w-[184px]"
          >
            {icon}
            <span className="min-w-0 leading-none">
              <span className="block text-[9px] font-medium uppercase tracking-[0.12em] text-white/70">
                {eyebrow}
              </span>
              <span className="mt-1 block whitespace-nowrap text-[17px] font-semibold tracking-tight">
                {label}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

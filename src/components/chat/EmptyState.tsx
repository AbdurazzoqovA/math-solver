"use client";

import { useLanguage } from "@/context/LanguageContext";
import HeroInput from "./HeroInput";
import MobileAppLinks from "@/components/marketing/MobileAppLinks";
import AdSlot from "@/components/ads/AdSlot";

export default function EmptyState({ onStartChat, landingContent, storeLabels }: { onStartChat: (message: string, images?: { url: string; ocrText: string }[]) => void; landingContent: React.ReactNode; storeLabels: { appleEyebrow: string; googleEyebrow: string; ariaLabel: string } }) {
  const { locale, direction, t } = useLanguage();
  return (
    <div lang={locale} dir={direction} className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section - Perfectly centered in the viewport */}
      {/* Phones start below the 64px header instead of centering, so a short screen cannot push the heading under it. */}
      <div className="min-h-screen flex flex-col items-center justify-start pt-20 pb-16 md:justify-center md:pt-0 md:pb-32 w-full">
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
            {t("heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground w-full max-w-2xl mx-auto leading-relaxed">
            {t("heroDescription")}
          </p>
        </div>

        <HeroInput 
          onSubmit={(val, images) => {
            if (val.trim() || (images && images.length > 0)) {
              onStartChat(val, images);
            }
          }} 
        />

        <div className="mt-7 flex w-full flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {t("mobileApps")}
          </p>
          <MobileAppLinks placement="homepage_hero" labels={storeLabels} />
        </div>
      </div>

      {/* First ad sits below the fold, never next to the solver input. */}
      <AdSlot placement="landing" spacing="mb-8" />

      {/* Content below the fold */}
      <div className="w-full space-y-24 pb-24">
        {landingContent}
      </div>

    </div>
  );
}

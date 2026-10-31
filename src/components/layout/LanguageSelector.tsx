"use client";

import { Globe2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGES, isLocale } from "@/lib/i18n/locales";

export default function LanguageSelector({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  const { locale, direction, setLocale, t } = useLanguage();
  return (
    <label
      lang={locale}
      dir={direction}
      className={`relative flex min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-white/70 text-sm text-foreground focus-within:ring-2 focus-within:ring-primary-500 dark:border-white/10 dark:bg-zinc-900/70 ${compact ? "p-2" : "mx-1 p-3"}`}
      title={t("languageHelp")}
    >
      <Globe2 className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        dir="ltr"
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
        className={iconOnly
          ? "absolute inset-0 w-full cursor-pointer opacity-0"
          : `min-w-0 flex-1 cursor-pointer rounded bg-transparent py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${compact ? "max-w-28" : "w-full"}`}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}

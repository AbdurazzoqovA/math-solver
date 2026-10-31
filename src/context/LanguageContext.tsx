"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_LOCALE, LANGUAGE_STORAGE_KEY, getLanguage, isLocale, type Locale } from "@/lib/i18n/locales";
import { languageHref, localeFromPathname } from "@/lib/i18n/paths";
import { translate, type TranslationKey } from "@/lib/i18n/messages";

type LanguageContextValue = {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: React.ReactNode; initialLocale?: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  // A shared URL always determines its language on the server and client.
  // Saved/browser preferences never redirect visitors or change indexed content.
  const locale = pathname ? localeFromPathname(pathname) : initialLocale;
  const direction = getLanguage(locale).dir;
  const setLocale = useCallback((nextLocale: Locale) => {
    if (!isLocale(nextLocale)) return;
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale); } catch { /* Navigation works without storage. */ }
    const href = languageHref(nextLocale, pathname ?? "/");
    if (href !== pathname) router.push(href);
  }, [pathname, router]);
  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);
  const value = useMemo(() => ({ locale, direction, setLocale, t }), [locale, direction, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within a LanguageProvider");
  return value;
}

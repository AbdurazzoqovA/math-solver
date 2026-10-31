import type { Locale } from "./locales.ts";

const DETECTOR_HOME = "https://detecting-ai.com/";

// Only language pages advertised by Detecting AI and verified on 2026-10-07.
// Other MathSolver languages keep the English homepage rather than a guessed URL.
const detectorPages: Partial<Record<Locale, string>> = {
  en: DETECTOR_HOME,
  es: "https://detecting-ai.com/es",
  fr: "https://detecting-ai.com/fr",
  pt: "https://detecting-ai.com/pt",
  de: "https://detecting-ai.com/de",
  ru: "https://detecting-ai.com/ru",
  ar: "https://detecting-ai.com/ar",
  uz: "https://detecting-ai.com/uz",
};

export function aiDetectorLink(locale: Locale) {
  const href = detectorPages[locale];
  return { href: href ?? DETECTOR_HOME, hrefLang: href ? (locale === "pt" ? "pt-BR" : locale) : "en" };
}

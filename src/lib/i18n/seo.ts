import type { Metadata } from "next";
import { getLandingCopy } from "./landing";
import { LANGUAGES, type Locale } from "./locales";
import { SITE_URL, languageAlternates, localeHome } from "./paths";

export const openGraphLocales: Record<Locale, string> = {
  en: "en_US", es: "es_ES", fr: "fr_FR", pt: "pt_BR", de: "de_DE",
  ru: "ru_RU", uk: "uk_UA", uz: "uz_UZ", tr: "tr_TR", ar: "ar_AR",
  fa: "fa_IR", ur: "ur_PK", hi: "hi_IN", bn: "bn_BD", zh: "zh_CN", id: "id_ID",
};

export function homeMetadata(locale: Locale): Metadata {
  const copy = getLandingCopy(locale);
  const url = SITE_URL + (localeHome(locale) === "/" ? "" : localeHome(locale));
  const image = { url: "/math-solver-og.png", width: 1200, height: 630, alt: copy.imageAlt };
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: url, languages: languageAlternates() },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website", siteName: "MathSolver", url,
      title: copy.socialTitle, description: copy.metaDescription,
      locale: openGraphLocales[locale],
      alternateLocale: LANGUAGES.filter(({ code }) => code !== locale).map(({ code }) => openGraphLocales[code]),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: copy.socialTitle, description: copy.metaDescription, images: [image] },
  };
}

export function homeStructuredData(locale: Locale) {
  const copy = getLandingCopy(locale);
  const url = SITE_URL + (localeHome(locale) === "/" ? "" : localeHome(locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage", "@id": `${url}#webpage`, url,
        name: copy.socialTitle, description: copy.metaDescription, inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${url}#solver` },
      },
      {
        "@type": "WebApplication", "@id": `${url}#solver`, url,
        name: copy.socialTitle, description: copy.metaDescription, inLanguage: locale,
        applicationCategory: "EducationalApplication", operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: copy.featureCards.map(({ title }) => title),
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

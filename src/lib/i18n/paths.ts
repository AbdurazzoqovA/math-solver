import { DEFAULT_LOCALE, LANGUAGES, isLocale, type Locale } from "./locales.ts";

export const SITE_URL = "https://math-solver.io";
export const ENGLISH_ROUTE_PREFIXES = ["account-deletion", "auth", "blog", "calculator", "contact", "pricing", "privacy", "terms", "video-library", "practice-tests"] as const;

export function englishRouteRewrites() {
  return [
    { source: "/", destination: "/en" },
    ...ENGLISH_ROUTE_PREFIXES.map(path => ({ source: `/${path}/:path*`, destination: `/en/${path}/:path*` })),
  ];
}

export function englishRouteRedirects() {
  // Generated metadata images are assets rather than duplicate English pages.
  return [
    { source: "/en", destination: "/", permanent: true },
    { source: "/en/:path((?!.*opengraph-image).+)", destination: "/:path", permanent: true },
  ];
}

export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  const first = pathname.split("/")[1];
  return isLocale(first) ? pathname.slice(first.length + 1) || "/" : pathname;
}

export function localeHome(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}

// Only advertise pages whose visible content is actually translated.
export function languageHref(locale: Locale, pathname = "/"): string {
  const path = stripLocalePrefix(pathname).replace(/\/$/, "") || "/";
  if (path === "/" || path === "/practice-tests") {
    return locale === DEFAULT_LOCALE ? path : `/${locale}${path === "/" ? "" : path}`;
  }
  return locale === DEFAULT_LOCALE ? path : localeHome(locale);
}

export function languageAlternates(): Record<string, string> {
  return Object.fromEntries([
    ...LANGUAGES.map(({ code }) => [code, SITE_URL + (localeHome(code) === "/" ? "" : localeHome(code))]),
    ["x-default", SITE_URL],
  ]);
}

export function languageRoute(pathname: string): { kind: "next" | "rewrite" | "redirect"; pathname: string } {
  if (/^\/(?:api|_next)(?:\/|$)/.test(pathname)) {
    return { kind: "next", pathname };
  }
  const first = pathname.split("/")[1];
  if (first === DEFAULT_LOCALE) return pathname.includes("opengraph-image")
    ? { kind: "next", pathname }
    : { kind: "redirect", pathname: stripLocalePrefix(pathname) };
  if (/\.[^/]+$/.test(pathname)) return { kind: "next", pathname };
  if (isLocale(first)) return { kind: "next", pathname };
  if (pathname === "/" || ENGLISH_ROUTE_PREFIXES.some(prefix => prefix === first)) {
    return { kind: "rewrite", pathname: `/en${pathname === "/" ? "" : pathname}` };
  }
  return { kind: "next", pathname };
}

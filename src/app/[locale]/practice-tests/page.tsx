import type { Metadata } from "next";
import PracticeTestsPage from "@/components/practice/PracticeTestsPage";

import { LANGUAGES, isLocale } from "@/lib/i18n/locales";
import { languageHref, SITE_URL } from "@/lib/i18n/paths";
import { translate } from "@/lib/i18n/messages";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() { return LANGUAGES.map(({ code }) => ({ locale: code })); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return {
    title: `${translate(locale, "practiceTests")} | MathSolver`,
    description: translate(locale, "practiceLibrary"),
    alternates: { canonical: SITE_URL + languageHref(locale, "/practice-tests") },
    robots: { index: false, follow: false },
  };
}

export default function PracticeTestsRoute() {
  return (
    <div className="w-full h-full bg-background relative">
      <PracticeTestsPage />
    </div>
  );
}

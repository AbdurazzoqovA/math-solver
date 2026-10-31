import { notFound } from "next/navigation";
import SolverLanding from "@/components/chat/SolverLanding";
import { LANGUAGES, isLocale } from "@/lib/i18n/locales";
import { homeMetadata } from "@/lib/i18n/seo";

export const dynamicParams = false;
export function generateStaticParams() { return LANGUAGES.map(({ code }) => ({ locale: code })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return homeMetadata(locale);
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SolverLanding locale={locale} />;
}

import { notFound } from "next/navigation";

export function generateStaticParams() { return [{ locale: "en" }]; }

export default async function EnglishOnlyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  if ((await params).locale !== "en") notFound();
  return <div lang="en" dir="ltr" className="contents">{children}</div>;
}

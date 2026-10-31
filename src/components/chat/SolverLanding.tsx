import Link from "next/link";
import ChatArea from "./ChatArea";
import SeoSections from "./SeoSections";
import LanguageLinks from "@/components/layout/LanguageLinks";
import { getLandingCopy } from "@/lib/i18n/landing";
import { translate } from "@/lib/i18n/messages";
import { type Locale } from "@/lib/i18n/locales";
import { homeStructuredData } from "@/lib/i18n/seo";

export default function SolverLanding({ locale }: { locale: Locale }) {
  const copy = getLandingCopy(locale);
  const footerLinks = [["/blog", "blog"], ["/calculator", "calculators"], ["/privacy", "privacy"], ["/terms", "terms"], ["/contact", "contact"]] as const;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData(locale)).replace(/</g, "\\u003c") }} />
      <div className="w-full h-full bg-background relative flex items-center justify-center">
        <ChatArea storeLabels={{ appleEyebrow: copy.storeAppleEyebrow, googleEyebrow: copy.storeGoogleEyebrow, ariaLabel: copy.storeAriaLabel }} landingContent={
          <>
            <SeoSections locale={locale} />
            <footer className="w-full text-center text-muted-foreground/70 text-xs">
              <LanguageLinks locale={locale} />
              <div className="flex items-center justify-center gap-4 mb-3 flex-wrap px-4">
                {footerLinks.map(([href, key]) => <Link key={href} href={href} hrefLang="en" className="hover:text-foreground transition-colors">{translate(locale, key)}</Link>)}
              </div>
              {locale !== "en" && <p className="mb-3 px-4">{copy.englishGuidesNote}</p>}
              <p>{translate(locale, "disclaimer")}</p>
              <p className="mt-1">{copy.copyright}</p>
            </footer>
          </>
        } />
      </div>
    </>
  );
}

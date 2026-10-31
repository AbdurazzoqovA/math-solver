import Link from "next/link";
import { LANGUAGES, type Locale } from "@/lib/i18n/locales";
import { localeHome } from "@/lib/i18n/paths";
import { translate } from "@/lib/i18n/messages";

export default function LanguageLinks({ locale }: { locale: Locale }) {
  return (
    <nav aria-label={translate(locale, "language")} className="mb-6 flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm text-muted-foreground">
      {LANGUAGES.map(({ code, nativeName }) => (
        <Link key={code} href={localeHome(code)} hrefLang={code} lang={code} dir="auto" prefetch={false}
          aria-current={code === locale ? "page" : undefined}
          className="rounded underline decoration-transparent underline-offset-4 hover:text-foreground hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          {nativeName}
        </Link>
      ))}
    </nav>
  );
}

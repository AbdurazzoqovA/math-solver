"use client";

import { useLanguage } from "@/context/LanguageContext";
import { localeHome } from "@/lib/i18n/paths";
import { Sun, Moon, Menu, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useUI } from "@/context/UIContext";
import { useBilling } from "@/context/BillingContext";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/lib/i18n/paths";
import Link from "next/link";
import LanguageSelector from "./LanguageSelector";

export default function Header() {
  const { locale, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { setMobileSidebarOpen } = useUI();
  const { tier, isPlanLoaded } = useBilling();
  const pathname = usePathname();
  const showUpgrade = isPlanLoaded && tier === "free" && stripLocalePrefix(pathname) !== "/pricing";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Theme state is only reliable after next-themes hydrates on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <header lang={locale} dir="ltr" className="h-16 w-full flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 absolute top-0 left-0 right-0 pointer-events-none">
      
      {/* Mobile hamburger + logo */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-3 -ml-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          aria-label={t("openSidebar")}
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link
          href={localeHome(locale)}
          aria-label={t("home")}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex flex-col items-center justify-center font-bold text-lg shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <span className="leading-none drop-shadow-sm">√</span>
        </Link>
      </div>

      {/* Desktop spacer */}
      <div className="flex-1 hidden md:flex" />
      
      <div className="ml-auto flex min-w-0 items-center gap-2 pointer-events-auto">
        {showUpgrade && (
          <Link
            href="/pricing"
            aria-label={t("upgrade")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {/* The label is dropped only on the narrowest phones so every control stays on screen. */}
            <span className="hidden min-[360px]:inline">{t("upgrade")}</span>
          </Link>
        )}
        {/* Phones get the globe-only selector; the drawer keeps the full one. */}
        <div className="shrink-0 sm:hidden">
          <LanguageSelector compact iconOnly />
        </div>
        <div className="hidden min-w-0 sm:block">
          <LanguageSelector compact />
        </div>
        <div className="flex shrink-0 items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
          <button 
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all" 
            aria-label={t("theme")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted ? (
              theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" /> // placeholder before mount
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

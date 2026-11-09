"use client";

import { useLanguage } from "@/context/LanguageContext";
import { localeHome, languageHref, stripLocalePrefix } from "@/lib/i18n/paths";
import { useState, useSyncExternalStore } from "react";
import { BookOpen, Calculator, Clapperboard, Plus, History, PanelLeftClose, PanelLeftOpen, Trash2, Sun, Moon, GraduationCap, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { useChatContext, type Chat } from "@/context/ChatContext";
import { readableMath } from "@/lib/readable-math";
import { useUI } from "@/context/UIContext";
import { useBilling } from "@/context/BillingContext";
import Image from "next/image";
import Link from "next/link";
import AccountButton from "@/components/auth/AccountButton";
import LanguageSelector from "./LanguageSelector";
import { trackEvent } from "@/lib/analytics";

// Show the problem as readable math ("lim(x→3) …") instead of raw LaTeX. The
// stored title is a 50-character cut that can end mid-command, so use the
// first question when it is available.
function chatLabel(chat: Chat): string {
  const question = chat.messages.find((message) => message.role === "user")?.content;
  return readableMath((question ?? chat.title).slice(0, 300)) || chat.title;
}

const subscribeToHydration = () => () => {};

export default function Sidebar() {
  const { locale, direction, t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const isThemeReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const {
    chats,
    activeChatId,
    createNewChat,
    switchChat,
    deleteChat,
    dueReviewItems,
  } = useChatContext();
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUI();
  const { tier } = useBilling();
  const isPaidPlan = tier !== "free";
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const homeHref = localeHome(locale);
  const currentPath = stripLocalePrefix(pathname);
  const isOnPracticeTests = currentPath === "/practice-tests";
  const isOnVideoLibrary = currentPath === "/video-library";
  const isOnCalculators = currentPath.startsWith("/calculator");
  const isOnPricing = currentPath === "/pricing";

  // Sort chats by most recently updated
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  // Close mobile sidebar on navigation
  const handleChatSwitch = (chatId: string) => {
    switchChat(chatId);
    setMobileSidebarOpen(false);
    if (pathname !== homeHref) router.push(homeHref);
  };

  const handleNewChat = () => {
    createNewChat();
    setMobileSidebarOpen(false);
    if (pathname !== homeHref) router.push(homeHref);
  };

  const handlePracticeTestsClick = () => {
    setMobileSidebarOpen(false);
    router.push(languageHref(locale, "/practice-tests"));
  };

  const handleVideoLibraryClick = () => {
    setMobileSidebarOpen(false);
    router.push("/video-library");
  };

  const sidebarContent = (
    <div lang={locale} dir={direction} className="flex flex-col h-full bg-card/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl mx-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
      
      {/* Top Header Area: Toggle + Logo */}
      <div dir="ltr" className="flex items-center h-16 w-full mt-2 px-2 relative">
        
        {/* Desktop: sidebar collapse toggle | Mobile: close button */}
        <div className="w-10 shrink-0 flex items-center justify-center z-10 relative">
          {/* Desktop toggle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            title={isExpanded ? t("closeSidebar") : t("openSidebar")}
          >
            {isExpanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          {/* Mobile close */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="flex md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            title={t("closeSidebar")}
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Logo Container (slides/fades in next to it) */}
        <Link
          href={homeHref}
          aria-label={t("home")}
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-3 rounded-xl transition-all duration-300 absolute left-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} md:transition-all`}
        >
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <Image 
              src="/icons8-math-40.png" 
              alt="MathSolver Logo" 
              width={36} 
              height={36} 
              className="object-contain"
            />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 whitespace-nowrap">
            MathSolver
          </span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className={`mt-2 mb-4 transition-all duration-300 flex ${isExpanded ? 'px-4' : 'md:justify-center md:w-full justify-center'}`}>
        <button
          onClick={handleNewChat}
          className={`flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-foreground transition-all shadow-sm border border-black/5 dark:border-white/5 group hover:shadow-md hover:border-black/10 dark:hover:border-white/10 ${isExpanded ? 'w-full px-4 py-3 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : 'md:w-11 md:h-11 w-full px-4 py-3 md:px-0 md:py-0 rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.06)]'}`} 
          title={t("newChat")}
        >
          <Plus className={`w-5 h-5 group-hover:scale-110 transition-transform ${isExpanded ? 'text-primary-600 dark:text-primary-400' : 'text-blue-600 dark:text-blue-400'}`} />
          {isExpanded && <span className="font-medium text-sm">{t("newChat")}</span>}
          {/* On mobile when collapsed, still show label */}
          {!isExpanded && <span className="font-medium text-sm md:hidden">{t("newChat")}</span>}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar">
        <Link
          href="/calculator"
          onClick={() => setMobileSidebarOpen(false)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'} ${isOnCalculators ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          title={t("calculators")}
        >
          <Calculator className={`w-5 h-5 transition-colors shrink-0 ${isOnCalculators ? 'text-primary-500' : 'group-hover:text-primary-500'}`} />
          {isExpanded && <span className="font-medium text-sm truncate">{t("calculators")}</span>}
        </Link>

        <button
          onClick={handleVideoLibraryClick}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'} ${isOnVideoLibrary ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          title={t("videoLibrary")}
        >
          <Clapperboard className={`w-5 h-5 transition-colors shrink-0 ${isOnVideoLibrary ? 'text-primary-500' : 'group-hover:text-primary-500'}`} />
          {isExpanded && <span className="font-medium text-sm truncate">{t("videoLibrary")}</span>}
        </button>

        <button 
          onClick={handlePracticeTestsClick}
          className={`relative w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'} ${isOnPracticeTests ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          title={
            dueReviewItems.length > 0
              ? `${t("practiceTests")} — ${t("dueReview", { count: dueReviewItems.length })}`
              : t("practiceTests")
          }
        >
          <BookOpen className={`w-5 h-5 transition-colors shrink-0 ${isOnPracticeTests ? 'text-primary-500' : 'group-hover:text-primary-500'}`} />
          {isExpanded && <span className="font-medium text-sm truncate">{t("practiceTests")}</span>}
          {dueReviewItems.length > 0 && (
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white ${
                isExpanded
                  ? "ml-auto"
                  : "absolute right-1 top-1"
              }`}
              aria-label={t("dueReview", { count: dueReviewItems.length })}
            >
              {dueReviewItems.length > 9 ? "9+" : dueReviewItems.length}
            </span>
          )}
        </button>

        <Link
          href="/pricing"
          onClick={() => setMobileSidebarOpen(false)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'} ${isOnPricing ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium' : isPaidPlan ? 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5' : 'text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 font-medium'}`}
          title={isPaidPlan ? t("yourPlan") : t("upgrade")}
        >
          <Sparkles className={`w-5 h-5 transition-colors shrink-0 ${isPaidPlan && !isOnPricing ? 'group-hover:text-primary-500' : 'text-primary-500'}`} />
          {isExpanded && <span className="font-medium text-sm truncate">{isPaidPlan ? t("yourPlan") : t("upgrade")}</span>}
        </Link>

        <a
          href="https://eduzen.ai/?ref=math-solver.io&utm_source=math-solver.io&utm_medium=referral&utm_campaign=sidebar_cross_promotion&utm_content=ai_tutor"
          target="_blank"
          rel="noopener"
          onClick={() => {
            trackEvent("outbound_tool_click", { tool: "ai_tutor" });
            setMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 ${isExpanded ? 'justify-start px-4' : 'justify-center'}`}
          title={t("aiTutor")}
        >
          <GraduationCap className="w-5 h-5 transition-colors shrink-0 group-hover:text-primary-500" />
          {isExpanded && <span className="font-medium text-sm truncate">{t("aiTutor")}</span>}
        </a>

        {/* Recent Chats Section */}
        <div className={`pt-6 pb-2 transition-opacity duration-300 ${isExpanded ? 'opacity-100 px-4' : 'opacity-0 h-0 overflow-hidden pt-0'}`}>
          <div className="flex items-center text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
            <History className="w-3 h-3 mr-2" />
            {t("recent")}
          </div>
          <div className="space-y-1">
            {sortedChats.length === 0 && (
              <p className="text-xs text-muted-foreground/50 italic px-3 py-2">{t("noChats")}</p>
            )}
            {sortedChats.map((chat) => (
              <div key={chat.id} className="group/chat relative">
                <button
                  onClick={() => handleChatSwitch(chat.id)}
                  className={`w-full text-start px-3 py-2 text-sm rounded-lg transition-colors truncate pr-9 ${
                    chat.id === activeChatId
                      ? "text-foreground bg-primary-500/10 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  title={chatLabel(chat)}
                >
                  {chatLabel(chat)}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover/chat:opacity-100 [@media(hover:none)]:opacity-100 transition-all"
                  title={t("deleteChat")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-black/5 dark:border-white/5 shrink-0 flex flex-col gap-2">
        <LanguageSelector iconOnly={!isExpanded} />
        <div lang="en" dir="ltr"><AccountButton isExpanded={isExpanded} /></div>

        <button 
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          className={`w-full flex items-center p-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4 gap-3' : 'justify-center'}`}
          title={t("theme")}
        >
          {isThemeReady ? (
            resolvedTheme === "dark" ? (
              <Moon className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" />
            ) : (
              <Sun className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" />
            )
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {isExpanded && <span className="font-medium text-sm truncate">{t("theme")}</span>}
        </button>

        <div className={`flex flex-col gap-1 mt-2 text-xs text-muted-foreground/60 transition-all duration-300 ${isExpanded ? 'px-4 opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <Link href="/blog" onClick={() => setMobileSidebarOpen(false)} className="hover:text-foreground transition-colors py-1 truncate">{t("blog")}</Link>
          <Link href="/contact" onClick={() => setMobileSidebarOpen(false)} className="hover:text-foreground transition-colors py-1 truncate">{t("contact")}</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors py-1 truncate">{t("privacy")}</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors py-1 truncate">{t("terms")}</Link>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — hidden on mobile */}
      {/* max-h keeps a long chat list scrolling inside the sidebar even if a
          third-party script ever unpins the 100dvh shell height. */}
      <aside className={`hidden md:flex h-full max-h-[100dvh] bg-transparent flex-col py-6 shrink-0 transition-all duration-300 ease-in-out z-20 relative ${isExpanded ? 'w-64' : 'w-20'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar — overlay drawer */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute top-0 left-0 h-full w-72 bg-transparent flex flex-col py-4 z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

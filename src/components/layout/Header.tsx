"use client";

import { Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useUI } from "@/context/UIContext";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { setMobileSidebarOpen } = useUI();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 w-full flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 absolute top-0 left-0 right-0 pointer-events-none">
      
      {/* Mobile hamburger + logo */}
      <div className="flex-1 pointer-events-auto flex items-center gap-3 md:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-3 -ml-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex flex-col items-center justify-center font-bold text-lg shadow-lg">
          <span className="leading-none drop-shadow-sm">√</span>
        </div>
      </div>

      {/* Desktop spacer */}
      <div className="flex-1 hidden md:flex" />
      
      <div className="flex items-center gap-4 ml-auto pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
          <button 
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all" 
            aria-label="Toggle theme"
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

import { Sun, LogIn } from "lucide-react";

export default function Header() {
  return (
    <header className="h-20 w-full flex items-center justify-between px-8 z-10 shrink-0 absolute top-0 left-0 right-0 pointer-events-none">
      
      {/* Intentionally left blank to let the main content breathe. Components inside here are specific overlays */}
      <div className="flex-1 pointer-events-auto flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex flex-col items-center justify-center font-bold text-lg shadow-lg">
          <span className="leading-none drop-shadow-sm">√</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-auto pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-full transition-all" aria-label="Toggle theme">
            <Sun className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-sm font-medium transition-colors shadow-sm ml-1">
            <span>Sign In</span>
            <LogIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

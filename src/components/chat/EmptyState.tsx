"use client";

import HeroInput from "./HeroInput";
import SeoSections from "./SeoSections";

export default function EmptyState({ onStartChat }: { onStartChat: (message: string) => void }) {
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section - Perfectly centered in the viewport */}
      <div className="min-h-screen flex flex-col items-center justify-center w-full pb-32">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
            MathSolver
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground w-full max-w-lg mx-auto leading-relaxed">
            Upload an image, type an equation, or describe a problem to get a step-by-step solution.
          </p>
        </div>

        <HeroInput 
          onSubmit={(val) => {
            if (val.trim()) onStartChat(val);
          }} 
        />
      </div>

      {/* Content below the fold */}
      <div className="w-full space-y-24 pb-24">
        <SeoSections />

        {/* Minimum Footer */}
        <footer className="w-full text-center text-muted-foreground/50 text-[10px] sm:text-xs">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 flex-wrap px-4">
            <a href="#" className="hover:text-foreground transition-colors">Careers</a>
            <span>&middot;</span>
            <a href="#" className="hover:text-foreground transition-colors">Blog</a>
            <span>&middot;</span>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <span>&middot;</span>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <span>&middot;</span>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p>MathSolver can make mistakes. Please double check important steps and calculations.</p>
          <p className="mt-1">&copy; 2026 MathSolver. All rights reserved.</p>
        </footer>
      </div>

    </div>
  );
}

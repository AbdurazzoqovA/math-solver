"use client";

import HeroInput from "./HeroInput";
import SeoSections from "./SeoSections";

export default function EmptyState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
          MathSolver
        </h1>
        <p className="text-base md:text-lg text-muted-foreground w-full max-w-md mx-auto">
          Upload an image, type an equation, or describe a problem to get a step-by-step solution.
        </p>
      </div>

      <HeroInput onSubmit={onStartChat} />

      <SeoSections />

      {/* Minimum Footer */}
      <footer className="w-full text-center pb-8 mt-auto text-muted-foreground/50 text-[10px] sm:text-xs">
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 flex-wrap px-4">
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
  );
}

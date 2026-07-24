"use client";

import HeroInput from "./HeroInput";
import SeoSections from "./SeoSections";
import Link from "next/link";

export default function EmptyState({ onStartChat }: { onStartChat: (message: string, images?: { url: string; ocrText: string }[]) => void }) {
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section - Perfectly centered in the viewport */}
      <div className="min-h-screen flex flex-col items-center justify-center w-full pb-16 md:pb-32">
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
            Free AI Math Solver
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground w-full max-w-2xl mx-auto leading-relaxed">
            Type your equation, upload a photo, or describe any math problem. Get instant step-by-step solutions powered by AI.
          </p>
        </div>

        <HeroInput 
          onSubmit={(val, images) => {
            if (val.trim() || (images && images.length > 0)) {
              onStartChat(val, images);
            }
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
            <Link href="/calculator" className="hover:text-foreground transition-colors">Calculators</Link>
            <span>&middot;</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
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

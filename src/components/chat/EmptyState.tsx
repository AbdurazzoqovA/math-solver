"use client";

import HeroInput from "./HeroInput";
import SeoSections from "./SeoSections";
import Script from "next/script";
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

      {/* FAQ JSON-LD Structured Data */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is MathSolver?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "MathSolver is a free AI-powered math solver that delivers step-by-step solutions for algebra, calculus, geometry, trigonometry, statistics, and more. Simply type an equation or upload a photo of your math problem to get an instant, detailed breakdown.",
                },
              },
              {
                "@type": "Question",
                name: "Can MathSolver solve math from a photo?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Upload a picture of any handwritten or printed problem and MathSolver will read it, extract the equation, and return a full step-by-step solution automatically.",
                },
              },
              {
                "@type": "Question",
                name: "What subjects does MathSolver cover?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "It covers arithmetic, pre-algebra, algebra, geometry, trigonometry, precalculus, calculus, linear algebra, differential equations, statistics, probability, plus physics and chemistry questions.",
                },
              },
              {
                "@type": "Question",
                name: "Is MathSolver completely free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. You can solve unlimited problems, view every step-by-step explanation, and generate practice quizzes, all at no cost, with no account required.",
                },
              },
              {
                "@type": "Question",
                name: "How accurate is the AI math solver?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "MathSolver uses advanced AI models trained on millions of math problems. While it handles most problems with high accuracy, we always recommend double-checking critical calculations, especially for exams or professional work.",
                },
              },
              {
                "@type": "Question",
                name: "Does MathSolver work on mobile?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely. MathSolver runs in any modern browser on phones and tablets, no app install needed. The full math solver experience, including photo upload, works exactly the same on mobile.",
                },
              },
            ],
          }),
        }}
      />

    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpCircle, ImagePlus, Calculator } from "lucide-react";
import MathKeyboard from "./MathKeyboard";
import InlineMathInput, { type InlineMathInputHandle } from "./InlineMathInput";
import { useUI } from "@/context/UIContext";

export default function HeroInput({ onSubmit }: { onSubmit: () => void }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const inputRef = useRef<InlineMathInputHandle>(null);

  const { isCalculatorOpen, toggleCalculator, registerInsertCallback, unregisterInsertCallback } = useUI();

  // Register insert callback so the floating calculator can inject values
  useEffect(() => {
    const insertVal = (val: string) => {
      if (!inputRef.current) return;
      inputRef.current.smartInsert(val);
    };
    registerInsertCallback("hero-input", insertVal);
    return () => unregisterInsertCallback("hero-input");
  }, [registerInsertCallback, unregisterInsertCallback]);

  // Called by the Math Keyboard when a symbol is clicked
  const handleMathInsert = (latex: string) => {
    if (!inputRef.current) return;
    inputRef.current.smartInsert(latex);
  };

  const handleMathButtonClick = () => {
    const opening = !keyboardOpen;
    setKeyboardOpen(opening);
    if (opening) {
      setTimeout(() => {
        if (!inputRef.current) return;
        if (!inputRef.current.hasFocusedMath()) {
          // Only create a new chip if we aren't already editing one
          inputRef.current.insertMathChip();
        }
      }, 80);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 relative z-10">
      <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 dark:border-white/5 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] text-left">

        {/* Upload Zone */}
        <div 
          onMouseDown={(e) => e.preventDefault()}
          className="w-full border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 flex flex-col items-center justify-center gap-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
            <ImagePlus className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-base font-medium text-muted-foreground mt-1">
            Drag &amp; drop or{" "}
            <span className="text-primary-600 dark:text-primary-400">click to upload</span>{" "}
            an image or PDF
          </p>
        </div>

        {/* Unified Inline Input */}
        <div className="p-3">
          <InlineMathInput
            ref={inputRef}
            placeholder="Type your math problem, or click Σ Math to insert a formula…"
            onSubmit={onSubmit}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-2 px-2 pb-1">
            <div className="flex items-center gap-2">
              {/* Calculator toggle */}
              <button
                onClick={toggleCalculator}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center justify-center p-2.5 rounded-xl transition-colors group ${
                  isCalculatorOpen
                    ? "bg-primary-500/10 text-primary-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                title="Calculator"
              >
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>

              {/* Math keyboard toggle */}
              <button
                onClick={handleMathButtonClick}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors group ${
                  keyboardOpen
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <SigmaIcon className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                <span>Math</span>
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={onSubmit}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all outline-none scale-95 hover:scale-100 active:scale-95"
            >
              <ArrowUpCircle className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Math Keyboard Panel (slides in below toolbar) */}
        {keyboardOpen && (
          <div className="border-t border-black/5 dark:border-white/5 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <MathKeyboard onInsert={handleMathInsert} />
          </div>
        )}
      </div>
    </div>
  );
}

// Sigma icon (matches competitor "Σ Math Input" button)
function SigmaIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 7V4H6l6 8-6 8h12v-3" />
    </svg>
  );
}

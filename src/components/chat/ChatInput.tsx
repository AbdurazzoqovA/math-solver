"use client";

import { useState, useRef } from "react";
import { Calculator, Paperclip, ArrowUpCircle } from "lucide-react";
import InlineMathInput, { type InlineMathInputHandle } from "./InlineMathInput";
import MathKeyboard from "./MathKeyboard";
import { useUI } from "@/context/UIContext";

export default function ChatInput() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const inputRef = useRef<InlineMathInputHandle>(null);
  const { isCalculatorOpen, toggleCalculator } = useUI();

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
          inputRef.current.insertMathChip();
        }
      }, 80);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      <div className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-black/5 dark:border-white/10 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.12)] focus-within:bg-white dark:focus-within:bg-zinc-900">

        <div className="p-2 flex flex-col">
          {/* Inline rich input */}
          <InlineMathInput
            ref={inputRef}
            placeholder="Ask a math question or click Σ to insert a formula…"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-1 mt-1">
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                aria-label="Attach File"
                title="Attach image or PDF"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="w-px h-5 mx-1 bg-border" />

              <button
                onClick={toggleCalculator}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center justify-center p-2 rounded-xl transition-colors group ${
                  isCalculatorOpen
                    ? "bg-primary-500/10 text-primary-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                title="Calculator"
              >
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>

              <button
                onClick={handleMathButtonClick}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors group ${
                  keyboardOpen
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <SigmaIcon className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                <span className="hidden sm:inline">Math Input</span>
              </button>
            </div>

            <button className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all outline-none scale-95 hover:scale-100 active:scale-95">
              <ArrowUpCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Keyboard panel */}
        {keyboardOpen && (
          <div className="border-t border-black/5 dark:border-white/5 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <MathKeyboard onInsert={handleMathInsert} />
          </div>
        )}
      </div>

      <div className="text-center mt-4">
        <p className="text-[11px] text-muted-foreground/60 w-full max-w-md font-medium">
          MathSolver can make mistakes. Please verify important calculations.
        </p>
      </div>
    </div>
  );
}

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

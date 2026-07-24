"use client";

import { ArrowUpRight } from "lucide-react";
import HeroInput from "@/components/chat/HeroInput";
import type { CalculatorExample } from "@/lib/calculators";

export default function CalculatorSolver({
  slug,
  placeholder,
  inputHint,
  examples,
  onSubmit,
}: {
  slug: string;
  placeholder: string;
  inputHint?: string;
  examples: CalculatorExample[];
  onSubmit: (
    value: string,
    images?: { url: string; ocrText: string }[],
  ) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <HeroInput
        onSubmit={onSubmit}
        placeholder={placeholder}
        inputId={`calculator-${slug}`}
      />

      {inputHint ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {inputHint}
        </p>
      ) : null}

      <div className={inputHint ? "mt-4" : "mt-5"}>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Try an example
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {examples.map((example) => (
            <button
              key={example.expression}
              type="button"
              onClick={() => onSubmit(example.expression)}
              className="group flex min-h-20 items-center justify-between gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/70 active:translate-y-px dark:border-white/10 dark:bg-zinc-900 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
            >
              <span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {example.label}
                </span>
                <span className="mt-1 block font-mono text-sm text-foreground">
                  {example.expression}
                </span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { preprocessMathMarkdown } from "@/lib/math-markdown";

export default function PrintSolution({
  problem,
  solution,
  onClose,
}: {
  problem: string | null;
  solution: string;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("mathsolver-print-active");
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);

    // Let React commit the print sheet and KaTeX layout before opening the dialog.
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("mathsolver-print-active");
    };
  }, [onClose]);

  return createPortal(
    <article id="mathsolver-print-root" aria-label="Printable solution">
      <header className="mathsolver-print-header">
        <strong>MathSolver</strong>
        <span>Step-by-step solution</span>
      </header>
      {problem && (
        <section className="mathsolver-print-problem">
          <h1>Problem</h1>
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {preprocessMathMarkdown(problem)}
            </ReactMarkdown>
          </div>
        </section>
      )}
      <section className="mathsolver-print-answer">
        <h1>Solution</h1>
        <div className="prose max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {preprocessMathMarkdown(solution)}
          </ReactMarkdown>
        </div>
      </section>
    </article>,
    document.body,
  );
}

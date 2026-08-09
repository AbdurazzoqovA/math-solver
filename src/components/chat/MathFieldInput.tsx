"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { MathfieldElement } from "mathlive";

export interface MathFieldHandle {
  insertLatex: (latex: string) => void;
  getValue: () => string;
  focus: () => void;
}

const MathFieldInput = forwardRef<MathFieldHandle, {
  initialValue?: string;
  onChange?: (latex: string) => void;
}>(({ initialValue = "", onChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldElement>(null);
  const initialValueRef = useRef(initialValue);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let mounted = true;
    let mathfield: MathfieldElement | null = null;

    // Dynamically import mathlive to avoid SSR issues
    import("mathlive").then((ml) => {
      if (!mounted) return;

      // Create math-field element programmatically
      const mf = new ml.MathfieldElement();
      mf.style.width = "100%";
      mf.style.padding = "14px 16px";
      mf.style.fontSize = "1.3rem";
      mf.style.outline = "none";
      mf.style.backgroundColor = "transparent";
      mf.style.color = "inherit";
      mf.style.border = "none";
      mf.style.minHeight = "48px";

      // Disable the default virtual keyboard - we use our own
      mf.mathVirtualKeyboardPolicy = "manual";
      
      if (initialValueRef.current) {
        mf.setValue(initialValueRef.current);
      }

      mf.addEventListener("input", () => {
        onChangeRef.current?.(mf.getValue());
      });

      container.appendChild(mf);
      mfRef.current = mf;
      mathfield = mf;

      // Focus after mount
      setTimeout(() => mf.focus(), 150);
    });

    return () => {
      mounted = false;
      if (mathfield?.parentNode === container) {
        container.removeChild(mathfield);
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    insertLatex: (latex: string) => {
      if (mfRef.current) {
        mfRef.current.executeCommand(["insert", latex]);
        mfRef.current.focus();
      }
    },
    getValue: () => {
      return mfRef.current?.getValue() ?? "";
    },
    focus: () => {
      mfRef.current?.focus();
    },
  }));

  return (
    <div
      ref={containerRef}
      className="w-full border border-black/8 dark:border-white/8 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-400 transition-all"
    />
  );
});

MathFieldInput.displayName = "MathFieldInput";
export default MathFieldInput;

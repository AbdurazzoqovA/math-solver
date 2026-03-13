"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

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
  const mfRef = useRef<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Dynamically import mathlive to avoid SSR issues
    import("mathlive").then((ml) => {
      if (!containerRef.current) return;

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
      
      if (initialValue) {
        mf.setValue(initialValue);
      }

      mf.addEventListener("input", () => {
        onChange?.(mf.getValue());
      });

      containerRef.current.appendChild(mf);
      mfRef.current = mf;

      // Focus after mount
      setTimeout(() => mf.focus(), 150);
    });

    return () => {
      // Cleanup
      if (containerRef.current && mfRef.current) {
        try {
          containerRef.current.removeChild(mfRef.current);
        } catch (_) {}
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

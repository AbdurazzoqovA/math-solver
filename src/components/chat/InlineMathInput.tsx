"use client";

import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type SegDef = { type: "text"; id: string } | { type: "math"; id: string };

interface ChipHandle {
  insertLatex: (l: string) => void;
  getLatex: () => string;
}

export interface InlineMathInputHandle {
  insertMathChip: () => void;
  insertLatexInFocused: (latex: string) => void;
  smartInsert: (latex: string) => void;
  insertPlainText: (text: string) => void;
  getValue: () => string;
  hasFocusedMath: () => boolean;
  hasMathChips: () => boolean;
  focusLastMathChip: () => void;
  focus: () => void;
  clear: () => void;
}

let _id = 0;
const uid = () => `seg-${++_id}`;

function placeCursorAtEnd(el: HTMLElement) {
  try {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {}
}

// CSS injected into MathLive's Shadow DOM to kill toolbar icons
const MATHLIVE_HIDE_TOOLBAR_CSS = `
  .ML__virtual-keyboard-toggle,
  .ML__menu-toggle,
  [part="virtual-keyboard-toggle"],
  [part="menu-toggle"],
  [class*="keyboard-toggle"],
  [class*="menu-toggle"] {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
`;

// ── Inline Math Chip (MathLive) ────────────────────────────────────────────────
function MathChip({
  id,
  onFocus,
  onBlur,
  onDelete,
  onReady,
}: {
  id: string;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onDelete: (id: string) => void;
  onReady: (id: string, h: ChipHandle | null) => void;
}) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const mfRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    import("mathlive").then((ml) => {
      if (!mounted || !boxRef.current) return;

      const mf = new ml.MathfieldElement();
      mf.mathVirtualKeyboardPolicy = "manual";
      (mf as any).virtualKeyboardMode = "off";

      Object.assign(mf.style, {
        display: "inline-block",
        minWidth: "28px",
        fontSize: "1.25rem",
        outline: "none",
        background: "transparent",
        border: "none",
        color: "inherit",
        verticalAlign: "middle",
        lineHeight: "1.2",
      });

      mf.addEventListener("focus", () => onFocus(id));
      mf.addEventListener("blur", () => onBlur());

      boxRef.current.appendChild(mf);
      mfRef.current = mf;

      // Must be after appendChild — injects CSS directly into Shadow DOM
      // This is the only reliable way to hide MathLive's toolbar icons
      if (mf.shadowRoot) {
        const style = document.createElement("style");
        style.textContent = MATHLIVE_HIDE_TOOLBAR_CSS;
        mf.shadowRoot.appendChild(style);
      }

      // Remove hamburger menu (must be after mount)
      try { (mf as any).menuItems = []; } catch {}

      onReady(id, {
        insertLatex: (l) => {
          mf.executeCommand(["insert", l]);
          mf.focus();
        },
        getLatex: () => mf.getValue(),
      });

      setTimeout(() => mf.focus(), 80);
    });

    return () => {
      mounted = false;
      onReady(id, null);
      try {
        if (boxRef.current && mfRef.current) {
          boxRef.current.removeChild(mfRef.current);
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className="inline-flex items-center bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-700/60 rounded-lg px-2 py-0.5 mx-0.5 align-middle gap-0.5 shrink-0">
      <span ref={boxRef} />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onDelete(id);
        }}
        className="ml-0.5 text-primary-300 hover:text-red-400 transition-colors"
        aria-label="Remove formula"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── Text Span ──────────────────────────────────────────────────────────────────
const TextSpan = forwardRef<
  HTMLSpanElement,
  {
    id: string;
    onInput: (id: string, val: string) => void;
    onFocus: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
  }
>(({ id, onInput, onFocus, onKeyDown }, ref) => (
  <span
    ref={ref}
    contentEditable
    suppressContentEditableWarning
    data-seg-id={id}
    onInput={(e) => onInput(id, (e.target as HTMLSpanElement).textContent ?? "")}
    onFocus={onFocus}
    onKeyDown={onKeyDown}
    className="inline min-w-[2px] outline-none text-foreground text-[1.2rem] leading-relaxed whitespace-pre-wrap break-words"
  />
));
TextSpan.displayName = "TextSpan";

// ── Main InlineMathInput ───────────────────────────────────────────────────────
const InlineMathInput = forwardRef<
  InlineMathInputHandle,
  {
    placeholder?: string;
    className?: string;
    onSubmit?: () => void;
  }
>(({ placeholder, className = "", onSubmit }, ref) => {
  const [segs, setSegs] = useState<SegDef[]>(() => [{ type: "text", id: "initial-text" }]);
  const [focusedMath, setFocusedMath] = useState<string | null>(null);
  const lastActiveMathId = useRef<string | null>(null);
  const [hasContent, setHasContent] = useState(false);

  // Uncontrolled refs — no re-renders on keystroke
  const textValues = useRef<Record<string, string>>({});
  const chipHandles = useRef<Record<string, ChipHandle | null>>({});
  const textSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const lastTextId = useRef<string>("");

  useEffect(() => {
    const last = [...segs].reverse().find((s) => s.type === "text");
    if (last) lastTextId.current = last.id;
  }, [segs]);

  const checkHasContent = useCallback(() => {
    const hasText = Object.values(textValues.current).some((v) => v.trim());
    const hasMath = Object.values(chipHandles.current).some((h) => h?.getLatex().trim());
    setHasContent(hasText || hasMath);
  }, []);

  const handleTextInput = useCallback(
    (id: string, val: string) => {
      textValues.current[id] = val;
      checkHasContent();
    },
    [checkHasContent]
  );

  const insertMathChip = useCallback(() => {
    const mathId = uid();
    const textId = uid();
    textValues.current[textId] = "";
    setSegs((p) => [...p, { type: "math", id: mathId }, { type: "text", id: textId }]);
    setHasContent(true);
    // Optimistically set this so rapid symbol clicks target it immediately
    lastActiveMathId.current = mathId;
  }, []);

  const deleteMathChip = useCallback(
    (id: string) => {
      delete chipHandles.current[id];
      if (lastActiveMathId.current === id) lastActiveMathId.current = null;
      setSegs((p) => {
        const next = p.filter((s) => s.id !== id);
        for (let i = next.length - 2; i >= 0; i--) {
          if (next[i].type === "text" && next[i + 1]?.type === "text") {
            const a = next[i];
            const b = next[i + 1];
            textValues.current[a.id] =
              (textValues.current[a.id] ?? "") + (textValues.current[b.id] ?? "");
            delete textValues.current[b.id];
            next.splice(i, 2, a);
          }
        }
        return next.length ? next : [{ type: "text", id: uid() }];
      });
      checkHasContent();
    },
    [checkHasContent]
  );

  const getValue = useCallback(
    () =>
      segs
        .map((s) =>
          s.type === "text"
            ? (textValues.current[s.id] ?? "")
            : `$${chipHandles.current[s.id]?.getLatex() ?? ""}$`
        )
        .join("")
        .trim(),
    [segs]
  );

  const smartInsert = useCallback((latex: string) => {
    if (lastActiveMathId.current && chipHandles.current[lastActiveMathId.current]) {
      // We have a recent/active chip — use it
      chipHandles.current[lastActiveMathId.current]?.insertLatex(latex);
    } else {
      // No active chip — create one
      const mathId = uid();
      const textId = uid();
      textValues.current[textId] = "";
      lastActiveMathId.current = mathId;
      setSegs((p) => [...p, { type: "math", id: mathId }, { type: "text", id: textId }]);
      setHasContent(true);
      // Wait for mount to insert latex
      setTimeout(() => {
        chipHandles.current[mathId]?.insertLatex(latex);
      }, 150);
    }
  }, []);

  const insertLatexInFocused = useCallback(
    (l: string) => {
      if (focusedMath) chipHandles.current[focusedMath]?.insertLatex(l);
    },
    [focusedMath]
  );

  const hasFocusedMath = useCallback(() => focusedMath !== null, [focusedMath]);

  const hasMathChips = useCallback(() => segs.some((s) => s.type === "math"), [segs]);

  const focusLastMathChip = useCallback(() => {
    const lastMath = [...segs].reverse().find((s) => s.type === "math");
    if (lastMath) {
      lastActiveMathId.current = lastMath.id;
      chipHandles.current[lastMath.id]?.insertLatex("");
    }
  }, [segs]);

  const insertPlainText = useCallback((text: string) => {
    // Find the last text segment and insert plain text into it
    const targetId = lastTextId.current;
    const el = textSpanRefs.current[targetId];
    if (el) {
      // Append to existing content
      const existing = el.textContent || '';
      el.textContent = existing ? existing + ' ' + text : text;
      textValues.current[targetId] = el.textContent;
      setHasContent(true);
      el.focus();
      placeCursorAtEnd(el);
    }
  }, []);

  const focus = useCallback(() => {
    const el = textSpanRefs.current[lastTextId.current];
    if (el) { el.focus(); placeCursorAtEnd(el); }
  }, []);

  const clear = useCallback(() => {
    textValues.current = {};
    chipHandles.current = {};
    const newId = uid();
    textValues.current[newId] = "";
    setSegs([{ type: "text", id: newId }]);
    setHasContent(false);
    setFocusedMath(null);
    lastActiveMathId.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    insertMathChip,
    insertLatexInFocused: (l: string) => {
       if (lastActiveMathId.current) chipHandles.current[lastActiveMathId.current]?.insertLatex(l);
    },
    smartInsert,
    insertPlainText,
    getValue,
    hasFocusedMath,
    hasMathChips,
    focusLastMathChip,
    focus,
    clear,
  }));

  return (
    <div
      className={`relative w-full min-h-[52px] px-4 py-3 flex flex-wrap items-center gap-y-1 cursor-text ${className}`}
      onClick={(e) => { if (e.target === e.currentTarget) focus(); }}
    >
      {!hasContent && (
        <span className="absolute inset-0 px-4 py-3 flex items-center pointer-events-none text-muted-foreground/70 text-[1.2rem] leading-relaxed select-none">
          {placeholder}
        </span>
      )}

      {segs.map((seg) => {
        if (seg.type === "math") {
          return (
            <MathChip
              key={seg.id}
              id={seg.id}
              onFocus={(id) => {
                setFocusedMath(id);
                lastActiveMathId.current = id;
              }}
              onBlur={() => setFocusedMath(null)}
              onDelete={deleteMathChip}
              onReady={(id, h) => { chipHandles.current[id] = h; }}
            />
          );
        }
        return (
          <TextSpan
            key={seg.id}
            ref={(el) => { textSpanRefs.current[seg.id] = el; }}
            id={seg.id}
            onInput={handleTextInput}
            onFocus={() => {
              setFocusedMath(null);
              lastActiveMathId.current = null;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSubmit?.();
              }
            }}
          />
        );
      })}
    </div>
  );
});

InlineMathInput.displayName = "InlineMathInput";
export default InlineMathInput;

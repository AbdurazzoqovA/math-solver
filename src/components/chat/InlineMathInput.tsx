"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { X } from "lucide-react";
import type { MathfieldElement } from "mathlive";

// ── Types ──────────────────────────────────────────────────────────────────────
export type InlineMathDraftSegment = { type: "text" | "math"; value: string };
type SegDef = { type: "text" | "math"; id: string; initialValue?: string };

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
  initialLatex,
  onFocus,
  onBlur,
  onDelete,
  onReady,
  onChange,
}: {
  id: string;
  initialLatex?: string;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onDelete: (id: string) => void;
  onReady: (id: string, h: ChipHandle | null) => void;
  onChange: (id: string, latex: string) => void;
}) {
  const { t } = useLanguage();
  const boxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let mounted = true;
    let mathfield: MathfieldElement | null = null;
    const box = boxRef.current;
    import("mathlive").then((ml) => {
      if (!mounted || !box) return;

      const mf = new ml.MathfieldElement();
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.value = initialLatex ?? "";

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
      mf.addEventListener("input", () => onChange(id, mf.getValue()));

      box.appendChild(mf);
      mathfield = mf;

      // Must be after appendChild — injects CSS directly into Shadow DOM
      // This is the only reliable way to hide MathLive's toolbar icons
      if (mf.shadowRoot) {
        const style = document.createElement("style");
        style.textContent = MATHLIVE_HIDE_TOOLBAR_CSS;
        mf.shadowRoot.appendChild(style);
      }

      // Remove hamburger menu (must be after mount)
      mf.menuItems = [];

      onReady(id, {
        insertLatex: (l) => {
          mf.executeCommand(["insert", l]);
          onChange(id, mf.getValue());
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
        if (box && mathfield?.parentNode === box) {
          box.removeChild(mathfield);
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span dir="ltr" className="inline-flex items-center bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-700/60 rounded-lg px-2 py-0.5 mx-0.5 align-middle gap-0.5 shrink-0">
      <span ref={boxRef} />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onDelete(id);
        }}
        className="ml-0.5 text-primary-300 hover:text-red-400 transition-colors"
        aria-label={t("removeFormula")}
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
    initialValue?: string;
    onInput: (id: string, val: string) => void;
    onFocus: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLSpanElement>) => void;
  }
>(({ id, initialValue, onInput, onFocus, onKeyDown }, ref) => (
  <span
    ref={(el) => {
      if (el && !el.dataset.initialized) {
        el.textContent = initialValue ?? "";
        el.dataset.initialized = "true";
      }
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    }}
    contentEditable
    dir="auto"
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
    initialDraft?: InlineMathDraftSegment[];
    onDraftChange?: (draft: InlineMathDraftSegment[]) => void;
  }
>(({ placeholder, className = "", onSubmit, initialDraft, onDraftChange }, ref) => {
  const [segs, setSegs] = useState<SegDef[]>(() => {
    const restored = initialDraft?.map((segment, index) => ({
      type: segment.type,
      id: `initial-${index}`,
      initialValue: segment.value,
    })) ?? [];
    return restored.length ? restored : [{ type: "text", id: "initial-text" }];
  });
  const segsRef = useRef(segs);
  const [focusedMath, setFocusedMath] = useState<string | null>(null);
  const lastActiveMathId = useRef<string | null>(null);
  const [hasContent, setHasContent] = useState(() => segs.some((s) => s.type === "math" || s.initialValue?.trim()));

  // Keep the editable DOM uncontrolled while publishing a restorable snapshot.
  const textValues = useRef<Record<string, string>>(Object.fromEntries(
    segs.filter((s) => s.type === "text").map((s) => [s.id, s.initialValue ?? ""]),
  ));
  const mathValues = useRef<Record<string, string>>(Object.fromEntries(
    segs.filter((s) => s.type === "math").map((s) => [s.id, s.initialValue ?? ""]),
  ));
  const chipHandles = useRef<Record<string, ChipHandle | null>>({});
  const textSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const lastTextId = useRef<string>("");
  const onDraftChangeRef = useRef(onDraftChange);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  const replaceSegs = useCallback((next: SegDef[]) => {
    segsRef.current = next;
    setSegs(next);
  }, []);

  const publishDraft = useCallback(() => {
    onDraftChangeRef.current?.(segsRef.current.map((segment) => ({
      type: segment.type,
      value: segment.type === "text"
        ? textValues.current[segment.id] ?? ""
        : chipHandles.current[segment.id]?.getLatex() ?? mathValues.current[segment.id] ?? "",
    })));
  }, []);

  useEffect(() => {
    const last = [...segs].reverse().find((s) => s.type === "text");
    if (last) lastTextId.current = last.id;
  }, [segs]);

  const checkHasContent = useCallback(() => {
    const hasText = Object.values(textValues.current).some((v) => v.trim());
    const hasMath = Object.values(mathValues.current).some((value) => value.trim());
    setHasContent(hasText || hasMath);
  }, []);

  const handleTextInput = useCallback(
    (id: string, val: string) => {
      textValues.current[id] = val;
      checkHasContent();
      publishDraft();
    },
    [checkHasContent, publishDraft]
  );

  const handleMathChange = useCallback((id: string, latex: string) => {
    mathValues.current[id] = latex;
    checkHasContent();
    publishDraft();
  }, [checkHasContent, publishDraft]);

  const insertMathChip = useCallback(() => {
    const mathId = uid();
    const textId = uid();
    mathValues.current[mathId] = "";
    textValues.current[textId] = "";
    replaceSegs([...segsRef.current, { type: "math", id: mathId }, { type: "text", id: textId }]);
    setHasContent(true);
    // Optimistically set this so rapid symbol clicks target it immediately
    lastActiveMathId.current = mathId;
    publishDraft();
  }, [replaceSegs, publishDraft]);

  const deleteMathChip = useCallback(
    (id: string) => {
      delete chipHandles.current[id];
      delete mathValues.current[id];
      if (lastActiveMathId.current === id) lastActiveMathId.current = null;
      const next = segsRef.current.filter((s) => s.id !== id);
      for (let i = next.length - 2; i >= 0; i--) {
        if (next[i].type === "text" && next[i + 1]?.type === "text") {
          const a = next[i];
          const b = next[i + 1];
          textValues.current[a.id] =
            (textValues.current[a.id] ?? "") + (textValues.current[b.id] ?? "");
          delete textValues.current[b.id];
          const span = textSpanRefs.current[a.id];
          if (span) span.textContent = textValues.current[a.id];
          next.splice(i, 2, a);
        }
      }
      replaceSegs(next.length ? next : [{ type: "text", id: uid() }]);
      checkHasContent();
      publishDraft();
    },
    [checkHasContent, replaceSegs, publishDraft]
  );

  const getValue = useCallback(
    () =>
      segsRef.current
        .map((s) =>
          s.type === "text"
            ? (textValues.current[s.id] ?? "")
            : `$${chipHandles.current[s.id]?.getLatex() ?? mathValues.current[s.id] ?? ""}$`
        )
        .join("")
        .trim(),
    []
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
      mathValues.current[mathId] = latex;
      lastActiveMathId.current = mathId;
      replaceSegs([...segsRef.current, { type: "math", id: mathId, initialValue: latex }, { type: "text", id: textId }]);
      setHasContent(true);
      publishDraft();
    }
  }, [replaceSegs, publishDraft]);

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
      publishDraft();
      el.focus();
      placeCursorAtEnd(el);
    }
  }, [publishDraft]);

  const focus = useCallback(() => {
    const el = textSpanRefs.current[lastTextId.current];
    if (el) { el.focus(); placeCursorAtEnd(el); }
  }, []);

  const clear = useCallback(() => {
    textValues.current = {};
    mathValues.current = {};
    chipHandles.current = {};
    const newId = uid();
    textValues.current[newId] = "";
    replaceSegs([{ type: "text", id: newId }]);
    setHasContent(false);
    setFocusedMath(null);
    lastActiveMathId.current = null;
    publishDraft();
  }, [replaceSegs, publishDraft]);

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
              initialLatex={seg.initialValue}
              onFocus={(id) => {
                setFocusedMath(id);
                lastActiveMathId.current = id;
              }}
              onBlur={() => setFocusedMath(null)}
              onDelete={deleteMathChip}
              onReady={(id, h) => { chipHandles.current[id] = h; }}
              onChange={handleMathChange}
            />
          );
        }
        return (
          <TextSpan
            key={seg.id}
            ref={(el) => { textSpanRefs.current[seg.id] = el; }}
            id={seg.id}
            initialValue={seg.initialValue}
            onInput={handleTextInput}
            onFocus={() => {
              setFocusedMath(null);
              lastActiveMathId.current = null;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
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

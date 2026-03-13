"use client";

import { useState } from "react";

// ─── Pinned Symbols (Always visible on top) ──────────────────────────
const pinnedSymbols = [
  { display: "⬚/⬚", latex: "\\frac{#0}{#0}", desc: "Fraction" },
  { display: "x□", latex: "x^{#0}", desc: "Superscript" },
  { display: "x₍₎", latex: "x_{#0}", desc: "Subscript" },
  { display: "√⬚", latex: "\\sqrt{#0}", desc: "Square root" },
  { display: "∛⬚", latex: "\\sqrt[3]{#0}", desc: "Cube root" },
  { display: "log₍₎", latex: "\\log_{#0}", desc: "Log base" },
  { display: "∫⬚", latex: "\\int_{#0}^{#0}", desc: "Integral" },
  { display: "Σ", latex: "\\sum_{#0}^{#0}", desc: "Summation" },
  { display: "π", latex: "\\pi", desc: "Pi" },
  { display: "∞", latex: "\\infty", desc: "Infinity" },
];

// ─── Symbol Categories ───────────────────────────────────────────────
const categories = [
  {
    id: "popular",
    label: "Popular",
    symbols: [
      { display: "+", latex: "+", desc: "Plus" },
      { display: "−", latex: "-", desc: "Minus" },
      { display: "×", latex: "\\times", desc: "Multiply" },
      { display: "÷", latex: "\\div", desc: "Divide" },
      { display: "!", latex: "!", desc: "Factorial" },
      { display: "log", latex: "\\log(", desc: "Log" },
      { display: "ln", latex: "\\ln(", desc: "Natural log" },
      { display: "x²", latex: "x^2", desc: "Squared" },
      { display: "x⁻¹", latex: "x^{-1}", desc: "Inverse" },
      { display: "(ⁿₖ)", latex: "\\binom{#0}{#0}", desc: "Binomial" },
      { display: "π", latex: "\\pi", desc: "Pi" },
      { display: "→", latex: "\\rightarrow", desc: "Arrow" },
      { display: "e", latex: "e", desc: "Euler" },
      { display: "eˣ", latex: "e^{#0}", desc: "Exponential" },
      { display: "i", latex: "i", desc: "Imaginary" },
    ],
  },
  {
    id: "trig",
    label: "sin cos",
    symbols: [
      { display: "θ", latex: "\\theta", desc: "Theta" },
      { display: "□°", latex: "^{\\circ}", desc: "Degree" },
      { display: "sin", latex: "\\sin(", desc: "Sine" },
      { display: "cos", latex: "\\cos(", desc: "Cosine" },
      { display: "tan", latex: "\\tan(", desc: "Tangent" },
      { display: "cot", latex: "\\cot(", desc: "Cotangent" },
      { display: "csc", latex: "\\csc(", desc: "Cosecant" },
      { display: "sec", latex: "\\sec(", desc: "Secant" },
      { display: "sinh", latex: "\\sinh(", desc: "Hyperbolic sine" },
      { display: "cosh", latex: "\\cosh(", desc: "Hyperbolic cosine" },
      { display: "tanh", latex: "\\tanh(", desc: "Hyperbolic tangent" },
      { display: "coth", latex: "\\coth(", desc: "Hyperbolic cotangent" },
      { display: "arcsin", latex: "\\arcsin(", desc: "Inverse sine" },
      { display: "arccos", latex: "\\arccos(", desc: "Inverse cosine" },
      { display: "arctan", latex: "\\arctan(", desc: "Inverse tangent" },
      { display: "arccsc", latex: "\\text{arccsc}(", desc: "Inverse cosecant" },
      { display: "arcsec", latex: "\\text{arcsec}(", desc: "Inverse secant" },
      { display: "arccot", latex: "\\text{arccot}(", desc: "Inverse cotangent" },
      { display: "≈", latex: "\\approx", desc: "Approximately equivalent" },
      { display: "≅", latex: "\\cong", desc: "Congruent" },
      { display: "⊥", latex: "\\perp", desc: "Perpendicular" },
      { display: "∥", latex: "\\parallel", desc: "Parallel" },
      { display: "→□", latex: "\\vec{#0}", desc: "Vector" },
      { display: "→u·→v", latex: "\\vec{u} \\cdot \\vec{v}", desc: "Dot product" },
      { display: "→AB", latex: "\\overrightarrow{AB}", desc: "Ray" },
    ],
  },
  {
    id: "calculus",
    label: "Calculus",
    symbols: [
      { display: "∫⬚", latex: "\\int_{#0}^{#0}", desc: "Definite integral" },
      { display: "d/dx", latex: "\\frac{d}{dx}", desc: "Derivative" },
      { display: "∂/∂x", latex: "\\frac{\\partial}{\\partial x}", desc: "Partial" },
      { display: "lim", latex: "\\lim_{x \\to #0}", desc: "Limit" },
      { display: "Σ", latex: "\\sum_{#0}^{#0}", desc: "Sum" },
      { display: "∏", latex: "\\prod_{#0}^{#0}", desc: "Product" },
      { display: "∐", latex: "\\coprod_{#0}^{#0}", desc: "Coproduct" },
      { display: "∮", latex: "\\oint", desc: "Contour integral" },
      { display: "d²/dx²", latex: "\\frac{d^2}{dx^2}", desc: "Second derivative" },
      { display: "∂²/∂x²", latex: "\\frac{\\partial^2}{\\partial x^2}", desc: "Second partial" },
      { display: "∇²", latex: "\\nabla^2", desc: "Laplacian" },
    ],
  },
  {
    id: "inequality",
    label: "≥ ≠",
    symbols: [
      { display: ">", latex: ">", desc: "Greater than" },
      { display: "<", latex: "<", desc: "Less than" },
      { display: "=", latex: "=", desc: "Equal" },
      { display: "≥", latex: "\\ge", desc: "Greater or equal" },
      { display: "≤", latex: "\\le", desc: "Less or equal" },
      { display: "≠", latex: "\\ne", desc: "Not equal" },
      { display: "±", latex: "\\pm", desc: "Plus-minus" },
      { display: "≡", latex: "\\equiv", desc: "Identical" },
      { display: "≫", latex: "\\gg", desc: "Much greater" },
      { display: "≪", latex: "\\ll", desc: "Much less" },
      { display: "~", latex: "\\sim", desc: "Similar" },
      { display: "≅", latex: "\\cong", desc: "Congruent" },
      { display: "≈", latex: "\\approx", desc: "Approximately" },
      { display: "≄", latex: "\\not\\simeq", desc: "Not asymptotically equal" },
    ],
  },
  {
    id: "sets",
    label: "∈ ⊂",
    symbols: [
      { display: "∀", latex: "\\forall", desc: "For all" },
      { display: "∃", latex: "\\exists", desc: "Exists" },
      { display: "∅", latex: "\\emptyset", desc: "Empty set" },
      { display: "∈", latex: "\\in", desc: "Element of" },
      { display: "∉", latex: "\\notin", desc: "Not element" },
      { display: "∋", latex: "\\ni", desc: "Contains as member" },
      { display: "⊂", latex: "\\subset", desc: "Subset" },
      { display: "⊆", latex: "\\subseteq", desc: "Subset or equal" },
      { display: "⊃", latex: "\\supset", desc: "Superset" },
      { display: "∪", latex: "\\cup", desc: "Union" },
      { display: "∩", latex: "\\cap", desc: "Intersection" },
      { display: "⊔", latex: "\\sqcup", desc: "Square union" },
      { display: "∧", latex: "\\wedge", desc: "Logical AND" },
      { display: "∨", latex: "\\vee", desc: "Logical OR" },
      { display: "≺", latex: "\\prec", desc: "Precedes" },
      { display: "≼", latex: "\\preceq", desc: "Precedes or equal" },
      { display: "≻", latex: "\\succ", desc: "Succeeds" },
      { display: "¬", latex: "\\neg", desc: "Logical NOT" },
      { display: "∪_a^b", latex: "\\bigcup_{a}^{b}", desc: "Big union" },
      { display: "∩_a^b", latex: "\\bigcap_{a}^{b}", desc: "Big intersection" },
    ],
  },
  {
    id: "arrows",
    label: "→",
    symbols: [
      { display: "←", latex: "\\leftarrow", desc: "Left arrow" },
      { display: "→", latex: "\\rightarrow", desc: "Right arrow" },
      { display: "↔", latex: "\\leftrightarrow", desc: "Left right arrow" },
      { display: "⇐", latex: "\\Leftarrow", desc: "Double left arrow" },
      { display: "⇒", latex: "\\Rightarrow", desc: "Double right arrow" },
      { display: "⇔", latex: "\\Leftrightarrow", desc: "Double left right arrow" },
      { display: "↦", latex: "\\mapsto", desc: "Maps to" },
      { display: "↑", latex: "\\uparrow", desc: "Up arrow" },
      { display: "↓", latex: "\\downarrow", desc: "Down arrow" },
      { display: "↕", latex: "\\updownarrow", desc: "Up down arrow" },
      { display: "⋱", latex: "\\ddots", desc: "Diagonal dots" },
      { display: "…", latex: "\\dots", desc: "Horizontal dots" },
      { display: "⋯", latex: "\\cdots", desc: "Center dots" },
      { display: "⋮", latex: "\\vdots", desc: "Vertical dots" },
    ],
  },
  {
    id: "greek",
    label: "ΩΔ",
    symbols: [
      // Row 1
      { display: "Σ", latex: "\\Sigma", desc: "Sigma" },
      { display: "Π", latex: "\\Pi", desc: "Pi" },
      { display: "Γ", latex: "\\Gamma", desc: "Gamma" },
      { display: "Δ", latex: "\\Delta", desc: "Delta" },
      { display: "∇", latex: "\\nabla", desc: "Nabla" },
      { display: "Θ", latex: "\\Theta", desc: "Theta" },
      { display: "Λ", latex: "\\Lambda", desc: "Lambda" },
      { display: "Φ", latex: "\\Phi", desc: "Phi" },
      { display: "Ψ", latex: "\\Psi", desc: "Psi" },
      { display: "Ω", latex: "\\Omega", desc: "Omega" },
      { display: "Υ", latex: "\\Upsilon", desc: "Upsilon" },
      // Row 2
      { display: "Ξ", latex: "\\Xi", desc: "Xi" },
      { display: "α", latex: "\\alpha", desc: "alpha" },
      { display: "β", latex: "\\beta", desc: "beta" },
      { display: "γ", latex: "\\gamma", desc: "gamma" },
      { display: "δ", latex: "\\delta", desc: "delta" },
      { display: "ϵ", latex: "\\epsilon", desc: "epsilon" },
      { display: "ζ", latex: "\\zeta", desc: "zeta" },
      { display: "η", latex: "\\eta", desc: "eta" },
      { display: "θ", latex: "\\theta", desc: "theta" },
      { display: "μ", latex: "\\mu", desc: "mu" },
      { display: "ν", latex: "\\nu", desc: "nu" },
      // Row 3
      { display: "ξ", latex: "\\xi", desc: "xi" },
      { display: "ρ", latex: "\\rho", desc: "rho" },
      { display: "σ", latex: "\\sigma", desc: "sigma" },
      { display: "τ", latex: "\\tau", desc: "tau" },
      { display: "ϕ", latex: "\\phi", desc: "phi" },
      { display: "χ", latex: "\\chi", desc: "chi" },
      { display: "ψ", latex: "\\psi", desc: "psi" },
      { display: "ω", latex: "\\omega", desc: "omega" },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────
export default function MathKeyboard({
  onInsert,
}: {
  onInsert: (latex: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("popular");
  const activeCategory = categories.find((c) => c.id === activeTab) ?? categories[0];

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-3">
      
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-black/5 dark:border-white/5 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 shrink-0
              ${activeTab === cat.id
                ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pinned Top Row (Always visible) */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 pb-3 border-b border-black/5 dark:border-white/5 mb-1">
        {pinnedSymbols.map((sym, i) => (
          <button
            key={`pinned-${i}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(sym.latex)}
            title={sym.desc}
            className="h-11 flex items-center justify-center rounded-lg border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-800/60 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-200 dark:hover:border-primary-500/30 text-foreground text-base font-medium transition-all active:scale-95 hover:shadow-sm"
          >
            {sym.display}
          </button>
        ))}
      </div>

      {/* Tab-Specific Symbol Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {activeCategory.symbols.map((sym, i) => (
          <button
            key={`${activeCategory.id}-${i}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(sym.latex)}
            title={sym.desc}
            className="h-11 flex items-center justify-center rounded-lg border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-800/60 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-200 dark:hover:border-primary-500/30 text-foreground text-base font-medium transition-all active:scale-95 hover:shadow-sm"
          >
            {sym.display}
          </button>
        ))}
      </div>
    </div>
  );
}

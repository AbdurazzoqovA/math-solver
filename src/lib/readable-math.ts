// Turns a typed or LaTeX math problem into short readable text for places that
// cannot render KaTeX, such as sidebar chat titles and tooltips:
// "\lim_{x \to 3} \left(\frac{x^2-9}{x-3}\right)" → "lim(x→3) ((x²-9)/(x-3))".
// It tolerates unbalanced or truncated input and never throws.

const SYMBOLS: Record<string, string> = {
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", ast: "*",
  to: "→", rightarrow: "→", Rightarrow: "⇒", leftarrow: "←", Leftarrow: "⇐",
  leftrightarrow: "↔", Leftrightarrow: "⇔", implies: "⇒", iff: "⇔", mapsto: "↦",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", lt: "<", gt: ">",
  approx: "≈", equiv: "≡", sim: "∼", propto: "∝",
  infty: "∞", partial: "∂", nabla: "∇", degree: "°", circ: "°", prime: "′",
  int: "∫", iint: "∬", iiint: "∭", oint: "∮", sum: "Σ", prod: "Π",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", subseteq: "⊆", supset: "⊃",
  supseteq: "⊇", cup: "∪", cap: "∩", setminus: "∖", emptyset: "∅",
  varnothing: "∅", forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨",
  wedge: "∧", vee: "∨", angle: "∠", perp: "⊥", parallel: "∥", triangle: "△",
  mid: "|", vert: "|", Vert: "‖", lvert: "|", rvert: "|", langle: "⟨", rangle: "⟩",
  lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", lbrace: "{", rbrace: "}",
  ldots: "…", cdots: "⋯", dots: "…", vdots: "⋮", therefore: "∴", because: "∵",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", varpi: "ϖ", rho: "ρ",
  sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ",
  chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ",
  Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ",
  Omega: "Ω",
  quad: " ", qquad: " ", space: " ", displaystyle: "", textstyle: "",
  limits: "", nolimits: "",
};

// Control symbols such as "\," and "\{".
const ESCAPES: Record<string, string> = {
  ",": " ", ":": " ", ";": " ", ">": " ", "!": "", " ": " ", "\\": "; ",
  "{": "{", "}": "}", "%": "%", "$": "$", "&": "&", "#": "#", "_": "_", "|": "‖",
};

const WORDS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh", "coth", "log", "ln", "lg", "exp", "lim", "max",
  "min", "sup", "inf", "det", "gcd", "lcm", "deg", "mod", "bmod", "dim",
  "ker", "arg",
]);

const TEXT_COMMANDS = new Set([
  "text", "textrm", "textit", "textbf", "textsf", "texttt", "mbox",
  "mathrm", "mathit", "mathbf", "mathsf", "mathtt", "mathcal", "operatorname",
  "boldsymbol", "bm", "vec", "overline", "underline", "bar", "hat", "tilde",
  "dot", "ddot", "widehat", "widetilde", "overrightarrow",
]);

const DELIMITER_SIZES = new Set([
  "left", "right", "middle", "big", "Big", "bigg", "Bigg", "bigl", "bigr",
  "Bigl", "Bigr", "biggl", "biggr", "Biggl", "Biggr",
]);

const BLACKBOARD: Record<string, string> = {
  R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ", P: "ℙ",
};

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼",
  "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", x: "ˣ", y: "ʸ", a: "ᵃ", b: "ᵇ",
  c: "ᶜ", d: "ᵈ", e: "ᵉ", k: "ᵏ", m: "ᵐ", t: "ᵗ", T: "ᵀ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "−": "₋", "=": "₌",
  "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", i: "ᵢ", j: "ⱼ", k: "ₖ", n: "ₙ",
  o: "ₒ", x: "ₓ", m: "ₘ", t: "ₜ",
};

const BIG_OPERATOR_END = /(?:lim|max|min|sup|inf|[ΣΠ∫∬∭∮])\s*$/;

type Cursor = { s: string; i: number };

function mapAll(text: string, table: Record<string, string>): string | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return null;
  let out = "";
  for (const ch of compact) {
    const mapped = table[ch];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
}

// Parenthesise anything longer than one number or symbol, e.g. (x+1)/2.
function wrap(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /^[\p{L}\p{N}.]+$/u.test(trimmed) && !/\p{L}\p{N}|\p{N}\p{L}/u.test(trimmed)
    ? trimmed
    : `(${trimmed})`;
}

function skipSpaces(c: Cursor) {
  while (c.s[c.i] === " ") c.i += 1;
}

function readArgument(c: Cursor): string {
  skipSpaces(c);
  const ch = c.s[c.i];
  if (ch === undefined) return "";
  if (ch === "{") {
    c.i += 1;
    return convertUntilClose(c);
  }
  if (ch === "\\") return readCommand(c, "");
  c.i += 1;
  return ch;
}

function readOptional(c: Cursor): string | null {
  skipSpaces(c);
  if (c.s[c.i] !== "[") return null;
  const end = c.s.indexOf("]", c.i);
  if (end === -1) return null;
  const inner = c.s.slice(c.i + 1, end);
  c.i = end + 1;
  return convert(inner);
}

function readCommand(c: Cursor, before: string): string {
  c.i += 1; // the backslash
  const name = /^[a-zA-Z]+/.exec(c.s.slice(c.i))?.[0];
  if (!name) {
    const symbol = c.s[c.i] ?? "";
    c.i += 1;
    return ESCAPES[symbol] ?? symbol;
  }
  c.i += name.length;

  if (name === "frac" || name === "dfrac" || name === "tfrac" || name === "cfrac") {
    const numerator = readArgument(c);
    const denominator = readArgument(c);
    return `${wrap(numerator)}/${wrap(denominator)}`;
  }
  if (name === "sqrt") {
    const index = readOptional(c)?.trim();
    const radicand = wrap(readArgument(c));
    if (!index) return `√${radicand}`;
    if (index === "3") return `∛${radicand}`;
    if (index === "4") return `∜${radicand}`;
    return `${mapAll(index, SUPERSCRIPT) ?? index}√${radicand}`;
  }
  if (DELIMITER_SIZES.has(name)) {
    skipSpaces(c);
    if (c.s[c.i] === ".") {
      c.i += 1;
      return "";
    }
    const delimiter =
      c.s[c.i] === "\\" ? readCommand(c, before) : (c.s[c.i++] ?? "");
    if (name === "left") skipSpaces(c); // "\left| x" → "|x"
    return delimiter;
  }
  if (name === "mathbb") {
    const letter = readArgument(c).trim();
    return BLACKBOARD[letter] ?? letter;
  }
  if (TEXT_COMMANDS.has(name)) return readArgument(c);
  if (name === "begin" || name === "end") {
    readArgument(c);
    return " ";
  }
  if (WORDS.has(name)) {
    // Keep "\sin x" as "sin x" but "\sin(x)" as "sin(x)".
    return /^\s*[\p{L}\p{N}\\]/u.test(c.s.slice(c.i)) && !/^\s*[_^]/.test(c.s.slice(c.i))
      ? `${name} `
      : name;
  }
  const symbol = SYMBOLS[name];
  if (symbol !== undefined) {
    skipSpaces(c); // TeX ignores spaces after a control word
    return symbol;
  }
  return name;
}

function convertScript(c: Cursor, kind: "^" | "_", before: string): string {
  const argument = readArgument(c).trim();
  if (!argument) return "";
  const table = kind === "^" ? SUPERSCRIPT : SUBSCRIPT;
  const mapped = mapAll(argument, table);
  if (mapped) return mapped;
  if (kind === "_" && BIG_OPERATOR_END.test(before)) return `(${argument}) `;
  return argument.length === 1 ? `${kind}${argument}` : `${kind}(${argument})`;
}

function convertUntilClose(c: Cursor): string {
  return convertLoop(c, true);
}

function convertLoop(c: Cursor, stopAtClose: boolean): string {
  let out = "";
  while (c.i < c.s.length) {
    const ch = c.s[c.i];
    if (ch === "}") {
      c.i += 1;
      if (stopAtClose) return out;
      continue;
    }
    if (ch === "{") {
      c.i += 1;
      out += convertUntilClose(c);
    } else if (ch === "\\") {
      // "x \right|" → "x|", matching the space dropped after "\left|".
      if (c.s.startsWith("\\right", c.i)) out = out.trimEnd();
      out += readCommand(c, out);
    } else if (ch === "^" || ch === "_") {
      c.i += 1;
      out += convertScript(c, ch, out);
    } else if (ch === "&" || ch === "~") {
      c.i += 1;
      out += " ";
    } else {
      out += ch;
      c.i += 1;
    }
  }
  return out;
}

function convert(text: string): string {
  return convertLoop({ s: text, i: 0 }, false);
}

export function readableMath(input: string): string {
  const withoutDelimiters = input
    .replace(/\\[()[\]]/g, " ")
    .replace(/(^|[^\\])\$+/g, "$1 ");
  return convert(withoutDelimiters)
    .replace(/\s+/g, " ")
    .replace(/([([{⟨]) /g, "$1")
    .replace(/ ([)\]}⟩])/g, "$1")
    .replace(/ ?([·×÷→⇒⇔≤≥≠≈∈∉⊂⊆∪∩]) ?/g, "$1")
    .trim();
}

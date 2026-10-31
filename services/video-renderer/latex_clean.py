"""Normalize generated LaTeX into what the renderer's TeX engine accepts."""

from __future__ import annotations

import re
import unicodedata

_UNICODE_MATH = (
    ("−", "-"),
    ("–", "-"),
    ("—", "-"),
    ("×", r"\times "),
    ("÷", r"\div "),
    ("·", r"\cdot "),
    ("⋅", r"\cdot "),
    ("∙", r"\cdot "),
    ("≤", r"\leq "),
    ("≥", r"\geq "),
    ("≠", r"\neq "),
    ("≈", r"\approx "),
    ("≡", r"\equiv "),
    ("±", r"\pm "),
    ("∓", r"\mp "),
    ("∞", r"\infty "),
    ("→", r"\to "),
    ("←", r"\leftarrow "),
    ("↔", r"\leftrightarrow "),
    ("⇒", r"\Rightarrow "),
    ("⇔", r"\Leftrightarrow "),
    ("∫", r"\int "),
    ("∑", r"\sum "),
    ("∏", r"\prod "),
    ("∂", r"\partial "),
    ("∇", r"\nabla "),
    ("∈", r"\in "),
    ("∉", r"\notin "),
    ("⊂", r"\subset "),
    ("⊆", r"\subseteq "),
    ("∪", r"\cup "),
    ("∩", r"\cap "),
    ("∅", r"\emptyset "),
    ("∀", r"\forall "),
    ("∃", r"\exists "),
    ("∠", r"\angle "),
    ("△", r"\triangle "),
    ("⊥", r"\perp "),
    ("∥", r"\parallel "),
    ("∝", r"\propto "),
    ("∴", r"\therefore "),
    ("°", r"^{\circ}"),
    ("′", "'"),
    ("″", "''"),
    ("²", "^{2}"),
    ("³", "^{3}"),
    ("¹", "^{1}"),
    ("⁰", "^{0}"),
    ("⁴", "^{4}"),
    ("⁵", "^{5}"),
    ("⁶", "^{6}"),
    ("⁷", "^{7}"),
    ("⁸", "^{8}"),
    ("⁹", "^{9}"),
    ("ⁿ", "^{n}"),
    ("₀", "_{0}"),
    ("₁", "_{1}"),
    ("₂", "_{2}"),
    ("₃", "_{3}"),
    ("₄", "_{4}"),
    ("½", r"\frac{1}{2}"),
    ("⅓", r"\frac{1}{3}"),
    ("¼", r"\frac{1}{4}"),
    ("¾", r"\frac{3}{4}"),
    ("α", r"\alpha "),
    ("β", r"\beta "),
    ("γ", r"\gamma "),
    ("δ", r"\delta "),
    ("ε", r"\varepsilon "),
    ("θ", r"\theta "),
    ("λ", r"\lambda "),
    ("μ", r"\mu "),
    ("π", r"\pi "),
    ("ρ", r"\rho "),
    ("σ", r"\sigma "),
    ("τ", r"\tau "),
    ("φ", r"\varphi "),
    ("ϕ", r"\phi "),
    ("ω", r"\omega "),
    ("Γ", r"\Gamma "),
    ("Δ", r"\Delta "),
    ("Θ", r"\Theta "),
    ("Λ", r"\Lambda "),
    ("Σ", r"\Sigma "),
    ("Φ", r"\Phi "),
    ("Ω", r"\Omega "),
    ("“", '"'),
    ("”", '"'),
    ("‘", "'"),
    ("’", "'"),
    ("…", r"\ldots "),
    (" ", " "),
    (" ", " "),
    (" ", " "),
)
_DELIMITERS = (
    ("$$", "$$"),
    (r"\[", r"\]"),
    (r"\(", r"\)"),
    ("$", "$"),
)


def _strip_math_delimiters(value: str) -> str:
    changed = True
    while changed:
        changed = False
        value = value.strip()
        for opening, closing in _DELIMITERS:
            if (
                len(value) > len(opening) + len(closing)
                and value.startswith(opening)
                and value.endswith(closing)
                and not value.endswith("\\" + closing)
            ):
                value = value[len(opening) : -len(closing)]
                changed = True
                break
    return value


# "\frac" written with one backslash inside JSON decodes to a form feed
# followed by "rac". Form feed and backspace never belong in a formula; tab,
# newline and carriage return are restored only before a known command tail.
_ESCAPED_COMMANDS = {
    "\t": (
        "heta", "imes", "ext", "o", "an", "au", "frac", "op", "riangle",
        "herefore", "ilde", "extbf", "extit", "extrm", "anh",
    ),
    # Single-letter tails are omitted: a real line break before "e" or "i"
    # must not become a command.
    "\n": (
        "eq", "abla", "ot", "otin", "eg", "mid", "leq", "geq", "ewline",
        "parallel", "subseteq",
    ),
    "\r": (
        "ho", "ight", "ightarrow", "angle", "floor", "ceil", "Vert", "vert",
    ),
}


def _restore_escaped_commands(value: str) -> str:
    value = value.replace("\x0c", "\\f").replace("\x08", "\\b")
    for character, tails in _ESCAPED_COMMANDS.items():
        letter = {"\t": "t", "\n": "n", "\r": "r"}[character]
        for tail in sorted(tails, key=len, reverse=True):
            value = re.sub(
                re.escape(character) + tail + r"(?![A-Za-z])",
                lambda match, text="\\" + letter + tail: text,
                value,
            )
    return value


def clean_latex(value: str) -> str:
    """Return TeX-safe math source without changing its mathematics."""
    value = _restore_escaped_commands(value)
    value = unicodedata.normalize("NFC", value)
    value = _strip_math_delimiters(value)
    value = re.sub(r"√\s*\(([^()]*)\)", r"\\sqrt{\1}", value)
    value = re.sub(r"√\s*(\w+)", r"\\sqrt{\1}", value)
    value = value.replace("√", r"\surd ")
    for symbol, replacement in _UNICODE_MATH:
        value = value.replace(symbol, replacement)
    # Interior delimiters and comment/parameter characters end a TeX group
    # early; a percent sign would silently swallow the rest of the formula.
    value = value.replace("$$", " ")
    value = re.sub(r"(?<!\\)\$", r"\\$", value)
    value = re.sub(r"(?<!\\)%", r"\\%", value)
    value = re.sub(r"(?<!\\)#", r"\\#", value)
    if r"\begin{" not in value:
        value = re.sub(r"(?<!\\)&", r"\\&", value)
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def has_non_ascii(value: str) -> bool:
    return any(ord(character) > 127 for character in value)


_TEX_TO_PLAIN = (
    (r"\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"(\1)/(\2)"),
    (r"\\sqrt\s*\{([^{}]*)\}", r"√(\1)"),
    (r"\\(?:text|mathrm|mathbf|mathit|operatorname|textbf|textit)\s*\{([^{}]*)\}", r"\1"),
    (r"\\(?:left|right|big|Big|bigg|Bigg|displaystyle|limits)\b", ""),
    (r"\\(?:quad|qquad|,|;|:|!| )", " "),
    (r"\\times\b", "×"),
    (r"\\cdot\b", "·"),
    (r"\\div\b", "÷"),
    (r"\\pm\b", "±"),
    (r"\\leq?\b", "≤"),
    (r"\\geq?\b", "≥"),
    (r"\\neq?\b", "≠"),
    (r"\\approx\b", "≈"),
    (r"\\infty\b", "∞"),
    (r"\\(?:to|rightarrow|longrightarrow)\b", "→"),
    (r"\\(?:Rightarrow|Longrightarrow|implies)\b", "⇒"),
    (r"\\int\b", "∫"),
    (r"\\sum\b", "Σ"),
    (r"\\pi\b", "π"),
    (r"\\theta\b", "θ"),
    (r"\\alpha\b", "α"),
    (r"\\beta\b", "β"),
    (r"\\Delta\b", "Δ"),
    (r"\\lambda\b", "λ"),
    (r"\\(?:begin|end)\s*\{[^{}]*\}", " "),
    (r"\\\\", "  "),
    (r"\\([A-Za-z]+)", r"\1"),
    (r"\\(.)", r"\1"),
)


def latex_to_plain_text(value: str) -> str:
    """Last-resort readable text when TeX cannot typeset a formula."""
    text = value
    for _ in range(4):
        previous = text
        for pattern, replacement in _TEX_TO_PLAIN[:3]:
            text = re.sub(pattern, replacement, text)
        if text == previous:
            break
    for pattern, replacement in _TEX_TO_PLAIN[3:]:
        text = re.sub(pattern, replacement, text)
    text = text.replace("{", "").replace("}", "").replace("&", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text or "…"

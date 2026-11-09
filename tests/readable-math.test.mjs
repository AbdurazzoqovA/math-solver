import assert from "node:assert/strict";
import test from "node:test";
import { readableMath } from "../src/lib/readable-math.ts";

const cases = [
  ["x*12=1", "x*12=1"],
  ["2x+3y = 1 , 3y-12x=3", "2x+3y = 1 , 3y-12x=3"],
  ["\\lim_{x \\to 3} \\left( \\frac{x^2-9}{x-3} \\right)", "lim(x→3) ((x²-9)/(x-3))"],
  ["x\\cdot 12=12\\:y\\cdot 3", "x·12=12 y·3"],
  ["\\sqrt{x+1} = 3", "√(x+1) = 3"],
  ["\\sqrt[3]{8}", "∛8"],
  ["\\int_0^1 x^2 \\, dx", "∫₀¹ x² dx"],
  ["\\frac{1}{2} + \\frac{3}{4}", "1/2 + 3/4"],
  ["\\sin^2 x + \\cos^2 x = 1", "sin² x + cos² x = 1"],
  ["\\sin(x) = \\frac{\\pi}{6}", "sin(x) = π/6"],
  ["$x^{10} \\geq 2$", "x¹⁰≥2"],
  ["\\log_{2} 8", "log₂ 8"],
  ["\\sum_{i=1}^{n} i", "Σᵢ₌₁ⁿ i"],
  ["\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}", "1 2; 3 4"],
  ["\\text{Find } x \\text{ if } 2x = 4", "Find x if 2x = 4"],
  ["x \\in \\mathbb{R}", "x∈ℝ"],
  ["\\left| x - 2 \\right| < 5", "|x - 2| < 5"],
  ["e^{i\\pi} + 1 = 0", "e^(iπ) + 1 = 0"],
];

for (const [input, expected] of cases) {
  test(`readable: ${input}`, () => {
    assert.equal(readableMath(input), expected);
  });
}

test("tolerates truncated or unbalanced LaTeX", () => {
  assert.equal(readableMath("\\lim_{x \\to 3} \\left…"), "lim(x→3) …");
  assert.equal(readableMath("\\frac{x+1"), "(x+1)/");
  assert.equal(readableMath("}} \\"), "");
});

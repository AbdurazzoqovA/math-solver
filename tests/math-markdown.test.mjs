import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { preprocessMathMarkdown } from "../src/lib/math-markdown.ts";

function renderMathMarkdown(content) {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
      },
      preprocessMathMarkdown(content),
    ),
  );
}

test("renders number-leading solver expressions from image solutions with KaTeX", () => {
  const solution = [
    "**Step 1: Simplify the expression inside the parentheses**",
    "",
    "$1 + 2 = 3$",
    "",
    "The expression now becomes: $6 \\div 2(3)$",
    "",
    "First, perform the division: $6 \\div 2 = 3$",
  ].join("\n");

  const processed = preprocessMathMarkdown(solution);
  const html = renderMathMarkdown(solution);

  assert.match(processed, /\$1 \+ 2 = 3\$/);
  assert.match(processed, /\$6 \\div 2\(3\)\$/);
  assert.doesNotMatch(processed, /\\\$1 \+ 2 = 3\$/);
  assert.ok((html.match(/class="katex"/g) ?? []).length >= 3);
  assert.doesNotMatch(html, />\$1 \+ 2 = 3\$/);
});

test("keeps standalone and repeated currency amounts as text", () => {
  const sentence =
    "A notebook costs $12.50 today and a pen costs $7.25.";
  const list = "Prices: $12.50, $7.25, and $3.00.";
  const arithmeticProse = "The total is $1 + tax, not $2.";

  assert.equal(
    preprocessMathMarkdown(sentence),
    "A notebook costs \\$12.50 today and a pen costs \\$7.25.",
  );
  assert.equal(
    preprocessMathMarkdown(list),
    "Prices: \\$12.50, \\$7.25, and \\$3.00.",
  );
  assert.equal(
    preprocessMathMarkdown(arithmeticProse),
    "The total is \\$1 + tax, not \\$2.",
  );

  for (const content of [sentence, list, arithmeticProse]) {
    const html = renderMathMarkdown(content);
    assert.doesNotMatch(html, /class="katex"/);
    assert.match(html, /\$\d/);
  }
});

test("normalizes alternate inline and block LaTeX delimiters", () => {
  const content = String.raw`Use \(x^2 + 1\), then compute \[\frac{3}{4}\].`;
  const html = renderMathMarkdown(content);

  assert.ok((html.match(/class="katex"/g) ?? []).length >= 2);
  assert.doesNotMatch(html, /\\\(|\\\)|\\\[|\\\]/);
});

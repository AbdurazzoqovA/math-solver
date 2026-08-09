import assert from "node:assert/strict";
import test from "node:test";
import { renderPressroomMath } from "../src/lib/pressroom-math.ts";

test("renders inline Pressroom delimiters as accessible KaTeX", () => {
  const html = String.raw`<p>OpenStax states <a href="https://openstax.org">the product rule</a> as: if \(j(x)=f(x)g(x)\), then \(j'(x)=f'(x)g(x)+f(x)g'(x)\).</p>`;
  const rendered = renderPressroomMath(html);

  assert.equal((rendered.match(/class="katex"/g) ?? []).length, 2);
  assert.match(rendered, /class="katex-mathml"/);
  assert.match(rendered, /href="https:\/\/openstax\.org"/);
  assert.doesNotMatch(rendered, /\\\(|\\\)/);
});

test("renders display math and aligned derivations", () => {
  const html = String.raw`<p>Differentiate:</p><p>\[\begin{aligned}y&amp;=(x^2+1)^5\\y'&amp;=5(x^2+1)^4(2x)\end{aligned}\]</p>`;
  const rendered = renderPressroomMath(html);

  assert.match(rendered, /post-math-display/);
  assert.match(rendered, /class="katex-display"/);
  assert.match(rendered, /<annotation encoding="application\/x-tex">/);
  assert.doesNotMatch(rendered, /\\\[|\\\]/);
});

test("does not interpret attributes, code, preformatted text, or escaped delimiters", () => {
  const html = String.raw`<p title="\(attribute\)">Render \(x^2\).</p><code>\(code\)</code><pre>\[pre\]</pre><p>Keep \\(literal\\).</p>`;
  const rendered = renderPressroomMath(html);

  assert.equal((rendered.match(/class="katex"/g) ?? []).length, 1);
  assert.ok(rendered.includes(String.raw`title="\(attribute\)"`));
  assert.ok(rendered.includes(String.raw`<code>\(code\)</code>`));
  assert.ok(rendered.includes(String.raw`<pre>\[pre\]</pre>`));
  assert.ok(rendered.includes(String.raw`Keep \\(literal\\)`));
});

test("preserves malformed math and leaves ordinary HTML byte-for-byte unchanged", () => {
  const malformed = String.raw`<p>Broken \(\frac{1}{\).</p>`;
  const ordinary = `<p>Price: $12.50. Use <strong>x²</strong> only in legacy content.</p>`;

  assert.equal(renderPressroomMath(malformed), malformed);
  assert.equal(renderPressroomMath(ordinary), ordinary);
});

test("is idempotent when rendered content is processed again", () => {
  const once = renderPressroomMath(String.raw`<p>Use \(x^2\).</p>`);
  assert.equal(renderPressroomMath(once), once);
});

import assert from "node:assert/strict";
import test from "node:test";
import { splitArticleForAds } from "../src/lib/article-ad-breaks.ts";

const section = (n) => `<h2>Section ${n}</h2><p>Text ${n}.</p>`;

test("keeps a short article whole", () => {
  const html = `<p>Intro</p>${section(1)}`;
  assert.deepEqual(splitArticleForAds(html), [html]);
});

test("breaks before the second section heading", () => {
  const html = `<p>Intro</p>${section(1)}${section(2)}${section(3)}`;
  const parts = splitArticleForAds(html);
  assert.equal(parts.length, 2);
  assert.equal(parts.join(""), html);
  assert.ok(parts[1].startsWith("<h2>Section 2</h2>"));
});

test("adds a second break in long articles", () => {
  const html = `<p>Intro</p>${[1, 2, 3, 4, 5].map(section).join("")}`;
  const parts = splitArticleForAds(html);
  assert.equal(parts.length, 3);
  assert.equal(parts.join(""), html);
  assert.ok(parts[1].startsWith("<h2>Section 2</h2>"));
  assert.ok(parts[2].startsWith("<h2>Section 4</h2>"));
});

test("never breaks inside a container", () => {
  const html = `<p>Intro</p>${section(1)}<blockquote><h2>Quoted</h2></blockquote>${section(2)}`;
  const parts = splitArticleForAds(html);
  assert.equal(parts.length, 2);
  assert.ok(parts[1].startsWith("<h2>Section 2</h2>"));
});

test("ignores h2-like tags such as <h2x>", () => {
  const html = `<p>Intro</p><h2x>no</h2x>${section(1)}`;
  assert.deepEqual(splitArticleForAds(html), [html]);
});

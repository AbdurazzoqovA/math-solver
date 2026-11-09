// Splits a blog article's HTML at section headings so in-article ads can sit
// between sections instead of inside one. A break is only taken where every
// block container opened earlier is already closed, so an ad can never land
// inside a list, table, quote or figure.

const CONTAINER_TAGS = [
  "div",
  "section",
  "article",
  "aside",
  "blockquote",
  "ul",
  "ol",
  "li",
  "table",
  "figure",
  "details",
  "pre",
];

function isTopLevel(prefix: string): boolean {
  for (const tag of CONTAINER_TAGS) {
    const opened = prefix.match(new RegExp(`<${tag}(?=[\\s>/])`, "gi"))?.length ?? 0;
    const closed = prefix.match(new RegExp(`</${tag}\\s*>`, "gi"))?.length ?? 0;
    if (opened !== closed) return false;
  }
  return true;
}

/**
 * Returns the article HTML in one to three parts. The first ad goes before the
 * second section heading (after the introduction and first section); articles
 * with four or more sections get a second ad about 60% of the way through.
 */
export function splitArticleForAds(html: string): string[] {
  const headings = [...html.matchAll(/<h2(?=[\s>])/gi)]
    .map((match) => match.index)
    .filter((index) => isTopLevel(html.slice(0, index)));

  const breaks: number[] = [];
  if (headings.length >= 2) breaks.push(headings[1]);
  if (headings.length >= 4) {
    breaks.push(headings[Math.max(3, Math.floor(headings.length * 0.6))]);
  }

  const parts: string[] = [];
  let start = 0;
  for (const index of breaks) {
    parts.push(html.slice(start, index));
    start = index;
  }
  parts.push(html.slice(start));
  return parts;
}

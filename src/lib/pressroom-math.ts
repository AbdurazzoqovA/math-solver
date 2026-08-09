import katex from "katex";
import {
  defaultTreeAdapter,
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
} from "parse5";

type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;
type TextNode = DefaultTreeAdapterTypes.TextNode;

const SKIPPED_TAGS = new Set([
  "code",
  "math",
  "pre",
  "script",
  "style",
  "svg",
  "template",
  "textarea",
]);

type MathDelimiter = {
  close: "\\)" | "\\]";
  displayMode: boolean;
  index: number;
};

type TextSegment =
  | { type: "text"; value: string }
  | { type: "node"; value: ChildNode };

function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === "#text";
}

function isElement(node: ChildNode): node is Element {
  return "tagName" in node;
}

function hasClass(element: Element, className: string) {
  const classAttribute = element.attrs.find(
    (attribute) => attribute.name === "class",
  );
  return classAttribute?.value.split(/\s+/).includes(className) ?? false;
}

function shouldSkipElement(element: Element) {
  return (
    SKIPPED_TAGS.has(element.tagName) ||
    hasClass(element, "katex") ||
    hasClass(element, "post-math")
  );
}

function isEscaped(content: string, index: number) {
  let backslashCount = 0;
  for (
    let cursor = index - 1;
    cursor >= 0 && content[cursor] === "\\";
    cursor -= 1
  ) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function findToken(content: string, token: string, startIndex: number) {
  let index = content.indexOf(token, startIndex);
  while (index !== -1 && isEscaped(content, index)) {
    index = content.indexOf(token, index + token.length);
  }
  return index;
}

function findNextOpeningDelimiter(
  content: string,
  startIndex: number,
): MathDelimiter | null {
  const inlineIndex = findToken(content, "\\(", startIndex);
  const displayIndex = findToken(content, "\\[", startIndex);

  if (inlineIndex === -1 && displayIndex === -1) return null;
  if (displayIndex !== -1 && (inlineIndex === -1 || displayIndex < inlineIndex)) {
    return { close: "\\]", displayMode: true, index: displayIndex };
  }
  return { close: "\\)", displayMode: false, index: inlineIndex };
}

function createMathNode(latex: string, displayMode: boolean) {
  try {
    const renderedMath = katex.renderToString(latex.trim(), {
      displayMode,
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: true,
      trust: false,
    });
    const modeClass = displayMode
      ? "post-math-display"
      : "post-math-inline";
    const fragment = parseFragment(
      `<span class="post-math ${modeClass}">${renderedMath}</span>`,
    );
    return fragment.childNodes[0] ?? null;
  } catch {
    return null;
  }
}

function appendTextSegment(segments: TextSegment[], value: string) {
  if (!value) return;
  const previous = segments.at(-1);
  if (previous?.type === "text") {
    previous.value += value;
  } else {
    segments.push({ type: "text", value });
  }
}

function transformTextNode(value: string) {
  const segments: TextSegment[] = [];
  let cursor = 0;
  let renderedCount = 0;

  while (cursor < value.length) {
    const delimiter = findNextOpeningDelimiter(value, cursor);
    if (!delimiter) {
      appendTextSegment(segments, value.slice(cursor));
      break;
    }

    appendTextSegment(segments, value.slice(cursor, delimiter.index));
    const mathStart = delimiter.index + 2;
    const mathEnd = findToken(value, delimiter.close, mathStart);
    if (mathEnd === -1) {
      appendTextSegment(segments, value.slice(delimiter.index));
      break;
    }

    const source = value.slice(mathStart, mathEnd);
    const renderedNode = source.trim()
      ? createMathNode(source, delimiter.displayMode)
      : null;
    if (renderedNode) {
      segments.push({ type: "node", value: renderedNode });
      renderedCount += 1;
    } else {
      appendTextSegment(
        segments,
        value.slice(delimiter.index, mathEnd + delimiter.close.length),
      );
    }
    cursor = mathEnd + delimiter.close.length;
  }

  if (renderedCount === 0) return null;
  return segments.map((segment) =>
    segment.type === "node"
      ? segment.value
      : defaultTreeAdapter.createTextNode(segment.value),
  );
}

function transformParent(parent: ParentNode): number {
  let renderedCount = 0;

  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes[index];
    if (isTextNode(child)) {
      const replacements = transformTextNode(child.value);
      if (!replacements) continue;
      for (const replacement of replacements) {
        replacement.parentNode = parent;
      }
      parent.childNodes.splice(index, 1, ...replacements);
      renderedCount += replacements.filter(isElement).length;
      index += replacements.length - 1;
      continue;
    }

    if (isElement(child) && !shouldSkipElement(child)) {
      renderedCount += transformParent(child);
    }
  }

  return renderedCount;
}

/**
 * Render Pressroom's explicit \(...\) and \[...\] authoring contract as
 * KaTeX without interpreting attributes, code samples, or existing math.
 */
export function renderPressroomMath(contentHtml: string) {
  if (!contentHtml.includes("\\(") && !contentHtml.includes("\\[")) {
    return contentHtml;
  }

  const fragment = parseFragment(contentHtml);
  return transformParent(fragment) > 0 ? serialize(fragment) : contentHtml;
}

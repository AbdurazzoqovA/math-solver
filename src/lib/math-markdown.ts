const CURRENCY_AMOUNT_PATTERN =
  /(?<![\\$])\$(?!\$)(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?=\s|[.,!?;:)]|$)/g;

const PRACTICE_MATH_SPAN_PATTERN =
  /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\$)(?:\\.|[^$\\])*(?<!\\)\$/g;

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

function startsCurrencyAmount(content: string, index: number) {
  return /^\$\d+(?:,\d{3})*(?:\.\d{1,2})?(?=\s|[.,!?;:)]|$)/.test(
    content.slice(index),
  );
}

function findNextInlineMathDelimiter(content: string, startIndex: number) {
  for (let index = startIndex; index < content.length; index += 1) {
    if (content[index] !== "$" || isEscaped(content, index)) continue;

    const isPartOfBlockDelimiter =
      content[index - 1] === "$" || content[index + 1] === "$";
    if (isPartOfBlockDelimiter || startsCurrencyAmount(content, index)) {
      continue;
    }

    return index;
  }

  return -1;
}

function continuesAsMath(content: string, amountEndIndex: number) {
  const closingDelimiterIndex = findNextInlineMathDelimiter(
    content,
    amountEndIndex,
  );
  if (closingDelimiterIndex === -1) return false;

  const continuation = content
    .slice(amountEndIndex, closingDelimiterIndex)
    .trim();

  if (!continuation) return true;
  if (/\\[A-Za-z]+/.test(continuation)) return true;
  if (/[A-Za-z]{2,}/.test(continuation)) return false;

  return (
    /[+\-*/=^_<>|()[\]{}×÷±√≤≥≠≈∑∏∫]/u.test(continuation) ||
    !/[A-Za-z]/.test(continuation)
  );
}

/**
 * Normalize model LaTeX delimiters for remark-math while keeping standalone
 * currency amounts out of math parsing.
 */
export function preprocessMathMarkdown(content: string) {
  const normalized = content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  return normalized.replace(
    CURRENCY_AMOUNT_PATTERN,
    (match, _amount, offset: number) =>
      continuesAsMath(normalized, offset + match.length)
        ? match
        : `\\${match}`,
  );
}

/**
 * Practice responses generated under the former JSON prompt can contain the
 * two visible characters `\\n` instead of a real newline. Decode those legacy
 * separators outside math spans, then apply the shared delimiter and currency
 * normalization. Keeping math spans intact avoids corrupting commands such as
 * `\\neq` and `\\nabla`.
 */
export function preprocessPracticeMarkdown(content: string) {
  let normalized = "";
  let previousIndex = 0;

  for (const match of content.matchAll(PRACTICE_MATH_SPAN_PATTERN)) {
    const matchIndex = match.index;
    normalized += content
      .slice(previousIndex, matchIndex)
      .replace(/\\n/g, "\n\n");
    normalized += match[0];
    previousIndex = matchIndex + match[0].length;
  }

  normalized += content.slice(previousIndex).replace(/\\n/g, "\n\n");

  return preprocessMathMarkdown(normalized);
}

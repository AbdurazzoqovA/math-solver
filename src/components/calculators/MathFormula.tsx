import katex from "katex";

export default function MathFormula({
  expression,
  display = true,
}: {
  expression: string;
  display?: boolean;
}) {
  const html = katex.renderToString(expression, {
    displayMode: display,
    output: "html",
    strict: "warn",
    throwOnError: false,
    trust: false,
  });

  return (
    <span
      className={display ? "block overflow-x-auto py-1" : "inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

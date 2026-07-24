type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "leftParen" }
  | { type: "rightParen" };

const functions: Record<string, (value: number) => number> = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  ln: Math.log,
  log: Math.log10,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
};

const constants: Record<string, number> = {
  e: Math.E,
  pi: Math.PI,
};

function stripEquationPrefix(expression: string) {
  return expression
    .trim()
    .replace(/^f\s*\(\s*x\s*\)\s*=/i, "")
    .replace(/^y\s*=/i, "");
}

function tokenize(expression: string) {
  const source = stripEquationPrefix(expression)
    .toLowerCase()
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("·", "*")
    .replaceAll("÷", "/")
    .replaceAll("π", "pi");
  if (source.length > 200) {
    throw new Error("Keep each function under 200 characters");
  }
  const rawTokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const match = source
        .slice(index)
        .match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/);
      if (!match) {
        throw new Error(`Invalid number near "${source.slice(index)}"`);
      }
      const value = Number(match[0]);
      if (!Number.isFinite(value)) {
        throw new Error("Numbers must be finite");
      }
      rawTokens.push({ type: "number", value });
      index += match[0].length;
      continue;
    }

    if (/[a-z]/.test(character)) {
      const match = source.slice(index).match(/^[a-z]+/);
      if (!match) {
        throw new Error(`Invalid name near "${source.slice(index)}"`);
      }
      rawTokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }

    if (
      character === "+" ||
      character === "-" ||
      character === "*" ||
      character === "/" ||
      character === "^"
    ) {
      rawTokens.push({ type: "operator", value: character });
      index += 1;
      continue;
    }

    if (character === "(") {
      rawTokens.push({ type: "leftParen" });
      index += 1;
      continue;
    }

    if (character === ")") {
      rawTokens.push({ type: "rightParen" });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character "${character}"`);
  }

  if (rawTokens.length === 0) {
    throw new Error("Enter a function of x");
  }

  const tokens: Token[] = [];
  for (const token of rawTokens) {
    const previous = tokens.at(-1);
    const previousCanMultiply =
      previous?.type === "number" ||
      previous?.type === "identifier" ||
      previous?.type === "rightParen";
    const nextCanMultiply =
      token.type === "number" ||
      token.type === "identifier" ||
      token.type === "leftParen";
    const previousIsFunction =
      previous?.type === "identifier" && previous.value in functions;

    if (previousCanMultiply && nextCanMultiply && !previousIsFunction) {
      tokens.push({ type: "operator", value: "*" });
    }
    tokens.push(token);
  }

  return tokens;
}

export function compileMathExpression(expression: string) {
  const tokens = tokenize(expression);
  let position = 0;

  const current = () => tokens[position];
  const consume = () => tokens[position++];

  function parseExpression(x: number): number {
    let value = parseTerm(x);

    while (true) {
      const token = current();
      if (
        token?.type !== "operator" ||
        (token.value !== "+" && token.value !== "-")
      ) {
        break;
      }
      consume();
      const right = parseTerm(x);
      value = token.value === "+" ? value + right : value - right;
    }

    return value;
  }

  function parseTerm(x: number): number {
    let value = parseUnary(x);

    while (true) {
      const token = current();
      if (
        token?.type !== "operator" ||
        (token.value !== "*" && token.value !== "/")
      ) {
        break;
      }
      consume();
      const right = parseUnary(x);
      value = token.value === "*" ? value * right : value / right;
    }

    return value;
  }

  function parseUnary(x: number): number {
    const token = current();
    if (
      token?.type === "operator" &&
      (token.value === "+" || token.value === "-")
    ) {
      consume();
      const value = parseUnary(x);
      return token.value === "-" ? -value : value;
    }
    return parsePower(x);
  }

  function parsePower(x: number): number {
    const base = parsePrimary(x);
    const token = current();
    if (token?.type === "operator" && token.value === "^") {
      consume();
      return Math.pow(base, parseUnary(x));
    }
    return base;
  }

  function parsePrimary(x: number): number {
    const token = consume();
    if (!token) {
      throw new Error("The expression ends unexpectedly");
    }

    if (token.type === "number") {
      return token.value;
    }

    if (token.type === "identifier") {
      if (token.value === "x") {
        return x;
      }
      if (token.value in constants) {
        return constants[token.value];
      }
      const mathFunction = functions[token.value];
      if (!mathFunction) {
        throw new Error(`Unsupported function "${token.value}"`);
      }
      if (current()?.type !== "leftParen") {
        throw new Error(`${token.value} needs parentheses`);
      }
      consume();
      const value = parseExpression(x);
      if (current()?.type !== "rightParen") {
        throw new Error(`Close the parentheses after ${token.value}`);
      }
      consume();
      return mathFunction(value);
    }

    if (token.type === "leftParen") {
      const value = parseExpression(x);
      if (current()?.type !== "rightParen") {
        throw new Error("Close the parentheses");
      }
      consume();
      return value;
    }

    throw new Error("A number, x, or function was expected");
  }

  const validate = (x: number) => {
    position = 0;
    const value = parseExpression(x);
    if (position !== tokens.length) {
      throw new Error("Check the operators and parentheses");
    }
    return value;
  };

  validate(0.731);

  return {
    normalized: stripEquationPrefix(expression),
    evaluate(x: number) {
      return validate(x);
    },
  };
}

"""Safe parsing of learner-facing graph expressions.

Planning and rendering share this module so a function that cannot be drawn is
removed while the plan is being repaired, not discovered after narration has
already been recorded.
"""

from __future__ import annotations

import ast
import math
import re
from typing import Callable

ALLOWED_FUNCTION_NAMES = frozenset(
    {"sin", "cos", "tan", "sqrt", "exp", "log", "abs"}
)
ALLOWED_CONSTANT_NAMES = frozenset({"pi", "e"})
ALLOWED_BINARY = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
ALLOWED_UNARY = (ast.UAdd, ast.USub)
MAX_EXPRESSION_LENGTH = 300

_SYMBOLS = (
    ("−", "-"),
    ("–", "-"),
    ("×", "*"),
    ("·", "*"),
    ("⋅", "*"),
    ("÷", "/"),
    ("π", "pi"),
    ("^", "**"),
    ("²", "**2"),
    ("³", "**3"),
)


def normalize_expression(expression: str) -> str:
    """Rewrite common handwritten notation into the safe expression grammar."""
    value = expression.strip()
    value = re.sub(r"^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*", "", value)
    for symbol, replacement in _SYMBOLS:
        value = value.replace(symbol, replacement)
    value = re.sub(r"\bln\s*\(", "log(", value)
    value = re.sub(r"√\s*\(", "sqrt(", value)
    value = re.sub(r"\|([^|]+)\|", r"abs(\1)", value)
    # Implicit multiplication: 2x, 2(x+1), (x+1)(x-1), x(x+1).
    value = re.sub(r"(\d)\s*(?=[A-Za-z(])", r"\1*", value)
    value = re.sub(r"\)\s*(?=[A-Za-z0-9(])", ")*", value)
    value = re.sub(r"\bx\s*(?=\()", "x*", value)
    return value


def _validate_node(node: ast.AST) -> None:
    if isinstance(node, ast.Expression):
        _validate_node(node.body)
        return
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(
            node.value, (int, float)
        ):
            raise ValueError("graph constants must be numeric")
        return
    if isinstance(node, ast.Name):
        if (
            node.id != "x"
            and node.id not in ALLOWED_FUNCTION_NAMES
            and node.id not in ALLOWED_CONSTANT_NAMES
        ):
            raise ValueError("graph expression contains an unknown name")
        return
    if isinstance(node, ast.BinOp) and isinstance(node.op, ALLOWED_BINARY):
        _validate_node(node.left)
        _validate_node(node.right)
        return
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ALLOWED_UNARY):
        _validate_node(node.operand)
        return
    if isinstance(node, ast.Call):
        if (
            not isinstance(node.func, ast.Name)
            or node.func.id not in ALLOWED_FUNCTION_NAMES
            or len(node.args) != 1
            or node.keywords
        ):
            raise ValueError("graph function call is not allowed")
        _validate_node(node.args[0])
        return
    raise ValueError("graph expression contains an unsupported operation")


def parse_expression(expression: str) -> ast.Expression:
    """Return a validated syntax tree or raise ValueError."""
    if len(expression) > MAX_EXPRESSION_LENGTH:
        raise ValueError("graph expression is too long")
    try:
        tree = ast.parse(normalize_expression(expression), mode="eval")
    except (SyntaxError, ValueError, MemoryError, RecursionError) as error:
        raise ValueError("graph expression could not be parsed") from error
    _validate_node(tree)
    return tree


def is_plottable(expression: object) -> bool:
    if not isinstance(expression, str) or not expression.strip():
        return False
    try:
        parse_expression(expression)
    except ValueError:
        return False
    return True


def compile_function(expression: str) -> Callable[[float], float]:
    """Compile a validated expression into a total real-valued function.

    Undefined, complex, and non-finite results are reported as NaN so the
    renderer can break the curve there instead of failing the lesson.
    """
    import sympy

    tree = parse_expression(expression)
    symbol = sympy.Symbol("x", real=True)
    local_values = {
        "x": symbol,
        "sin": sympy.sin,
        "cos": sympy.cos,
        "tan": sympy.tan,
        "sqrt": sympy.sqrt,
        "exp": sympy.exp,
        "log": sympy.log,
        "abs": sympy.Abs,
        "pi": sympy.pi,
        "e": sympy.E,
    }
    compiled = compile(tree, "<safe-graph>", "eval")
    symbolic = eval(compiled, {"__builtins__": {}}, local_values)  # noqa: S307
    function = sympy.lambdify(symbol, symbolic, modules=["numpy"])

    def evaluate(value: float) -> float:
        try:
            raw = function(value)
            if isinstance(raw, complex):
                if abs(raw.imag) > 1e-9:
                    return math.nan
                raw = raw.real
            result = float(raw)
        except (
            TypeError,
            ValueError,
            ZeroDivisionError,
            OverflowError,
            ArithmeticError,
        ):
            return math.nan
        return result if math.isfinite(result) else math.nan

    return evaluate

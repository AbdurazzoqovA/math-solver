"""Deterministic repair of generated lesson JSON before validation.

A language model often returns a teachable plan with one small contract slip:
an unknown enum value, an inverted range, an oversized label. Rejecting the
whole lesson for that costs a regeneration and can exhaust the planner, so the
learner sees an error for a problem that was perfectly teachable.

Repairs never invent or alter mathematics. They normalize structure, clamp
presentation bounds, and drop optional decoration that cannot be rendered.
Safety validation (for example unsafe TeX commands) still happens afterwards in
the typed models and remains authoritative.
"""

from __future__ import annotations

import math
import re
from copy import deepcopy
from typing import Any

from graph_math import is_plottable, normalize_expression
from latex_clean import clean_latex

PALETTE = ("blue", "teal", "yellow", "pink", "green")
COORDINATE_LIMIT = 1_000_000
MIN_RANGE_SPAN = 1e-6
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
COLOR_SYNONYMS = {
    "red": "pink",
    "rose": "pink",
    "magenta": "pink",
    "purple": "pink",
    "violet": "pink",
    "orange": "yellow",
    "gold": "yellow",
    "amber": "yellow",
    "cyan": "teal",
    "turquoise": "teal",
    "aqua": "teal",
    "lime": "green",
    "navy": "blue",
    "indigo": "blue",
    "sky": "blue",
}
ROLES = (
    "orient",
    "concept",
    "strategy",
    "misconception",
    "connection",
    "verify-generalize",
)
ROLE_SYNONYMS = {
    "orientation": "orient",
    "introduction": "orient",
    "intro": "orient",
    "notice": "orient",
    "conceptual": "concept",
    "model": "concept",
    "modeling": "concept",
    "method": "strategy",
    "solve": "strategy",
    "solution": "strategy",
    "demonstrate": "strategy",
    "mistake": "misconception",
    "common-mistake": "misconception",
    "contrast": "misconception",
    "connect": "connection",
    "verify": "verify-generalize",
    "generalize": "verify-generalize",
    "verification": "verify-generalize",
    "check": "verify-generalize",
    "summary": "verify-generalize",
}
PURPOSES = (
    "notice",
    "explain-why",
    "demonstrate",
    "connect",
    "contrast",
    "verify",
    "generalize",
)
PURPOSE_SYNONYMS = {
    "orient": "notice",
    "observe": "notice",
    "introduce": "notice",
    "explain": "explain-why",
    "why": "explain-why",
    "justify": "explain-why",
    "reason": "explain-why",
    "show": "demonstrate",
    "solve": "demonstrate",
    "calculate": "demonstrate",
    "compute": "demonstrate",
    "apply": "demonstrate",
    "construct": "demonstrate",
    "transform": "demonstrate",
    "connection": "connect",
    "relate": "connect",
    "link": "connect",
    "compare": "contrast",
    "misconception": "contrast",
    "mistake": "contrast",
    "check": "verify",
    "confirm": "verify",
    "verification": "verify",
    "transfer": "generalize",
    "extend": "generalize",
    "summarize": "generalize",
    "generalise": "generalize",
}
ACTIONS = ("construct", "transform", "highlight", "compare", "trace")
ACTION_SYNONYMS = {
    "build": "construct",
    "create": "construct",
    "draw": "construct",
    "write": "construct",
    "show": "construct",
    "reveal": "construct",
    "morph": "transform",
    "simplify": "transform",
    "substitute": "transform",
    "focus": "highlight",
    "emphasize": "highlight",
    "emphasise": "highlight",
    "point": "highlight",
    "contrast": "compare",
    "comparison": "compare",
    "follow": "trace",
    "plot": "trace",
    "animate": "trace",
}
KIND_SYNONYMS = {
    "numberline": "number-line",
    "number_line": "number-line",
    "number line": "number-line",
    "plot": "graph",
    "chart": "graph",
    "function": "graph",
    "diagram": "geometry",
    "shape": "geometry",
    "shapes": "geometry",
    "figure": "geometry",
    "scale": "balance",
    "formula": "equation",
    "expression": "equation",
    "text": "equation",
    "math": "equation",
    "table": "equation",
    "matrix": "equation",
}
KINDS = ("equation", "graph", "number-line", "balance", "geometry")
SHAPE_SYNONYMS = {
    "rect": "rectangle",
    "square": "rectangle",
    "box": "rectangle",
    "segment": "line",
    "vector": "arrow",
    "point": "dot",
    "ellipse": "circle",
}
SHAPES = ("line", "arrow", "rectangle", "circle", "dot")
FALLBACK_TRANSFER_CHECK = {
    "id": "verify-habit",
    "eyebrow": "Keep the habit",
    "prompt": "Which habit confirms that a final answer is correct?",
    "options": [
        {
            "id": "check-original",
            "label": "Check the result against the original problem",
        },
        {
            "id": "skip-check",
            "label": "Skip the check when the steps look familiar",
        },
    ],
    "correctOptionId": "check-original",
    "correctFeedback": (
        "Yes. Checking against the original problem catches slips in any "
        "earlier step."
    ),
    "incorrectFeedback": (
        "Familiar steps can still hide a slip, so check the result against "
        "the original problem."
    ),
}


def _text(value: Any, maximum: int, default: str = "") -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        value = str(value)
    if not isinstance(value, str):
        return default
    value = value.strip()
    if not value:
        return default
    if len(value) <= maximum:
        return value
    clipped = value[: maximum - 1].rsplit(" ", 1)[0].rstrip(" ,;:")
    return (clipped or value[: maximum - 1]) + "…"


def _latex(value: Any, maximum: int) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        value = str(value)
    if not isinstance(value, str):
        return ""
    cleaned = clean_latex(value)
    # Cutting TeX mid-formula leaves unbalanced groups; an oversized optional
    # field is dropped by its caller and the renderer guards required ones.
    return cleaned if len(cleaned) <= maximum else ""


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip().replace("−", "-"))
        except ValueError:
            return None
    else:
        return None
    return number if math.isfinite(number) else None


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _boolean(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "yes", "1"}:
            return True
        if lowered in {"false", "no", "0"}:
            return False
    return default


def _slug(value: Any, fallback: str) -> str:
    text = value if isinstance(value, str) else ""
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:64].strip("-")
    return text or fallback


def _choice(
    value: Any,
    allowed: tuple[str, ...],
    synonyms: dict[str, str],
    default: str,
) -> str:
    if not isinstance(value, str):
        return default
    lowered = value.strip().lower().replace("_", "-")
    if lowered in allowed:
        return lowered
    spaced = lowered.replace(" ", "-")
    if spaced in allowed:
        return spaced
    if lowered in synonyms:
        return synonyms[lowered]
    for token in re.split(r"[^a-z]+", lowered):
        if token in allowed:
            return token
        if token in synonyms:
            return synonyms[token]
    return default


def _color(value: Any, *, allow_hex: bool) -> str | None:
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    if lowered in PALETTE:
        return lowered
    if allow_hex and HEX_COLOR.fullmatch(value.strip()):
        return value.strip()
    return COLOR_SYNONYMS.get(lowered)


def _coordinate(value: Any) -> dict[str, float] | None:
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        value = {"x": value[0], "y": value[1]}
    if not isinstance(value, dict):
        return None
    x = _number(value.get("x"))
    y = _number(value.get("y"))
    if x is None or y is None:
        return None
    return {"x": _clamp(x, -6, 6), "y": _clamp(y, -3.25, 3.25)}


def _range(
    low: Any,
    high: Any,
    *,
    limit: float,
    default: tuple[float, float],
) -> tuple[float, float]:
    minimum = _number(low)
    maximum = _number(high)
    if minimum is None or maximum is None:
        minimum, maximum = default
    if minimum > maximum:
        minimum, maximum = maximum, minimum
    minimum = _clamp(minimum, -limit, limit)
    maximum = _clamp(maximum, -limit, limit)
    if maximum - minimum < MIN_RANGE_SPAN:
        center = (maximum + minimum) / 2
        minimum, maximum = center - 1, center + 1
        if minimum < -limit:
            minimum, maximum = -limit, -limit + 2
        if maximum > limit:
            minimum, maximum = limit - 2, limit
    return minimum, maximum


def _pair(value: Any) -> tuple[Any, Any]:
    if isinstance(value, (list, tuple)) and len(value) == 2:
        return value[0], value[1]
    return None, None


def _equation(source: dict[str, Any], action: str, latex: str) -> dict[str, Any]:
    visual: dict[str, Any] = {"kind": "equation", "action": action, "latex": latex}
    for key, maximum in (("primaryLabel", 80), ("secondaryLabel", 80)):
        label = _text(source.get(key), maximum)
        if label:
            visual[key] = label
    secondary = _latex(source.get("secondaryLatex"), 600)
    if secondary:
        visual["secondaryLatex"] = secondary
    emphasis = _latex(source.get("emphasisLatex"), 180)
    if emphasis:
        visual["emphasisLatex"] = emphasis
    focus = _latex(source.get("focusLatex"), 180)
    if focus and focus in latex:
        visual["focusLatex"] = focus
    secondary_focus = _latex(source.get("secondaryFocusLatex"), 180)
    if secondary and secondary_focus and secondary_focus in secondary:
        visual["secondaryFocusLatex"] = secondary_focus
    if visual["action"] == "compare" and not secondary:
        visual["action"] = "highlight"
    return visual


def _graph_function(value: Any) -> dict[str, Any] | None:
    if isinstance(value, str):
        value = {"expression": value}
    if not isinstance(value, dict):
        return None
    expression = next(
        (
            value[key]
            for key in ("expression", "fn", "expr", "function", "formula")
            if isinstance(value.get(key), str) and value[key].strip()
        ),
        None,
    )
    if expression is None or not is_plottable(expression):
        return None
    normalized = normalize_expression(expression)
    function: dict[str, Any] = {"expression": normalized}
    latex = _latex(value.get("latex"), 300)
    if latex:
        function["latex"] = latex
    label = _text(value.get("label"), 120)
    if label:
        function["label"] = label
    if not latex and not label:
        function["label"] = _text(expression, 120, "y")
    color = _color(value.get("color"), allow_hex=True)
    if color:
        function["color"] = color
    return function


def _sample_functions(
    functions: list[dict[str, Any]],
    x_range: tuple[float, float],
) -> list[float] | None:
    """Finite function values across the domain, or None without a plotter."""
    try:
        from graph_math import compile_function

        values: list[float] = []
        for function in functions:
            evaluate = compile_function(function["expression"])
            for index in range(81):
                x = x_range[0] + (x_range[1] - x_range[0]) * index / 80
                y = evaluate(x)
                if not math.isnan(y) and abs(y) <= COORDINATE_LIMIT:
                    values.append(y)
    except Exception:  # noqa: BLE001 - a range estimate is optional.
        return None
    return values


def _visible_y_range(values: list[float]) -> tuple[float, float] | None:
    if not values:
        return None
    ordered = sorted(values)
    # Trim the extremes so a pole does not flatten the rest of the curve.
    trim = len(ordered) // 20
    core = ordered[trim : len(ordered) - trim] or ordered
    low, high = core[0], core[-1]
    padding = max((high - low) * 0.12, abs(high) * 0.02, 0.5)
    return low - padding, high + padding


def _graph(source: dict[str, Any], action: str, latex: str) -> dict[str, Any] | None:
    raw_functions = source.get("functions")
    functions = [
        function
        for function in (
            _graph_function(item)
            for item in (raw_functions if isinstance(raw_functions, list) else [])
        )
        if function is not None
    ][:4]
    if not functions and is_plottable(source.get("expression")):
        functions = [
            {
                "expression": normalize_expression(source["expression"]),
                "label": _text(source["expression"], 120, "y"),
            }
        ]
    if not functions:
        return None

    domain_low, domain_high = _pair(source.get("xDomain"))
    x_range = _range(
        source.get("xMin", domain_low),
        source.get("xMax", domain_high),
        limit=COORDINATE_LIMIT,
        default=(-10, 10),
    )
    domain_low, domain_high = _pair(source.get("yDomain"))
    y_low = source.get("yMin", domain_low)
    y_high = source.get("yMax", domain_high)
    values = _sample_functions(functions, x_range)
    estimated = _visible_y_range(values) if values else None
    declared = _number(y_low) is not None and _number(y_high) is not None
    y_range = _range(
        y_low,
        y_high,
        limit=COORDINATE_LIMIT,
        default=estimated or (-10, 10),
    )
    if declared and estimated and values:
        visible = sum(1 for y in values if y_range[0] <= y <= y_range[1])
        if visible < len(values) * 0.25:
            # The declared window would show an empty grid instead of the
            # curve being discussed.
            y_range = _range(
                estimated[0],
                estimated[1],
                limit=COORDINATE_LIMIT,
                default=(-10, 10),
            )

    points = []
    raw_points = source.get("points")
    for item in raw_points if isinstance(raw_points, list) else []:
        if not isinstance(item, dict):
            continue
        x = _number(item.get("x"))
        y = _number(item.get("y"))
        if x is None or y is None:
            continue
        if not (
            x_range[0] <= x <= x_range[1] and y_range[0] <= y <= y_range[1]
        ):
            continue
        point: dict[str, Any] = {
            "x": x,
            "y": y,
            "label": _text(item.get("label"), 80),
        }
        color = _color(item.get("color"), allow_hex=True)
        if color:
            point["color"] = color
        points.append(point)

    visual: dict[str, Any] = {
        "kind": "graph",
        "action": "trace" if action == "compare" else action,
        "functions": functions,
        "xMin": x_range[0],
        "xMax": x_range[1],
        "yMin": y_range[0],
        "yMax": y_range[1],
        "points": points[:6],
    }
    if latex:
        visual["latex"] = latex
    return visual


def _nice_step(span: float) -> float:
    raw = span / 10
    magnitude = 10 ** math.floor(math.log10(raw)) if raw > 0 else 1
    for multiplier in (1, 2, 5, 10):
        step = multiplier * magnitude
        if span / step <= 12:
            return step
    return 10 * magnitude


def _number_line(
    source: dict[str, Any],
    action: str,
    latex: str,
) -> dict[str, Any] | None:
    if not latex:
        return None
    points = []
    raw_points = source.get("points")
    for item in raw_points if isinstance(raw_points, list) else []:
        if isinstance(item, (int, float)) and not isinstance(item, bool):
            item = {"value": item, "label": f"{item:g}"}
        if not isinstance(item, dict):
            continue
        value = _number(item.get("value", item.get("x")))
        if value is None or abs(value) > COORDINATE_LIMIT:
            continue
        points.append(
            {
                "value": value,
                "label": _text(item.get("label"), 80),
                "color": _color(item.get("color"), allow_hex=False) or "teal",
            }
        )
    points = points[:8]

    low = _number(source.get("minimum", source.get("min")))
    high = _number(source.get("maximum", source.get("max")))
    values = [point["value"] for point in points]
    if low is None or high is None:
        if values:
            low = min(values) - 2 if low is None else low
            high = max(values) + 2 if high is None else high
        else:
            low, high = -10, 10
    if values:
        low = min(low, min(values))
        high = max(high, max(values))
    minimum, maximum = _range(
        low,
        high,
        limit=COORDINATE_LIMIT,
        default=(-10, 10),
    )
    span = maximum - minimum
    step = _number(source.get("step"))
    # Long tick labels collide, so large values get fewer ticks.
    ticks = 12 if max(abs(minimum), abs(maximum)) >= 1000 else 30
    if step is None or step <= 0 or span / step > ticks:
        step = _nice_step(span)
    if span / step > 30:
        step = span / 10
    return {
        "kind": "number-line",
        "action": "construct" if action == "compare" else action,
        "latex": latex,
        "minimum": minimum,
        "maximum": maximum,
        "step": step,
        "points": points,
    }


def _balance(
    source: dict[str, Any],
    action: str,
    latex: str,
) -> dict[str, Any] | None:
    if not latex:
        return None
    left = _latex(source.get("leftLabel"), 120)
    right = _latex(source.get("rightLabel"), 120)
    if (not left or not right) and latex.count("=") == 1:
        derived_left, derived_right = (part.strip() for part in latex.split("="))
        left = left or derived_left[:120]
        right = right or derived_right[:120]
    if not left or not right:
        return None
    return {
        "kind": "balance",
        "action": "transform" if action == "compare" else action,
        "latex": latex,
        "leftLabel": left,
        "rightLabel": right,
        "balanced": _boolean(source.get("balanced"), True),
    }


def _shape(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    shape_type = _choice(value.get("type"), SHAPES, SHAPE_SYNONYMS, "")
    if not shape_type:
        return None
    shape: dict[str, Any] = {
        "type": shape_type,
        "label": _text(value.get("label"), 100),
        "color": _color(value.get("color"), allow_hex=False) or "blue",
    }
    if shape_type in {"line", "arrow"}:
        start = _coordinate(value.get("start", value.get("from")))
        end = _coordinate(value.get("end", value.get("to")))
        if start is None or end is None:
            return None
        if math.hypot(end["x"] - start["x"], end["y"] - start["y"]) < 0.05:
            return None
        shape["start"], shape["end"] = start, end
        return shape
    center = _coordinate(
        value.get("center", value.get("position", value.get("at")))
    )
    if center is None:
        return None
    shape["center"] = center
    for key, maximum in (("width", 12), ("height", 7), ("radius", 5)):
        number = _number(value.get(key))
        if number is not None and number > 0:
            shape[key] = min(number, maximum)
    if shape_type == "dot":
        shape.pop("width", None)
        shape.pop("height", None)
        if "radius" in shape:
            shape["radius"] = min(shape["radius"], 0.3)
    return shape


def _geometry(
    source: dict[str, Any],
    action: str,
    latex: str,
) -> dict[str, Any] | None:
    if not latex:
        return None
    raw_shapes = source.get("shapes")
    shapes = [
        shape
        for shape in (
            _shape(item)
            for item in (raw_shapes if isinstance(raw_shapes, list) else [])
        )
        if shape is not None
    ][:16]
    if not shapes:
        return None
    return {
        "kind": "geometry",
        "action": "construct" if action == "compare" else action,
        "latex": latex,
        "shapes": shapes,
    }


def repair_visual(value: Any) -> dict[str, Any] | None:
    """Return a renderable visual, or None when nothing can be shown."""
    if not isinstance(value, dict):
        return None
    kind = _choice(value.get("kind", value.get("type")), KINDS, KIND_SYNONYMS, "equation")
    action = _choice(value.get("action"), ACTIONS, ACTION_SYNONYMS, "highlight")
    latex = _latex(value.get("latex"), 600)

    builders = {
        "graph": _graph,
        "number-line": _number_line,
        "balance": _balance,
        "geometry": _geometry,
    }
    if kind in builders:
        visual = builders[kind](value, action, latex)
        if visual is not None:
            return visual
    # A representation that cannot be drawn degrades to its own formula; the
    # narration and mathematics stay intact.
    if not latex:
        return None
    return _equation(value, action, latex)


def _segment(value: Any, clip_title: str) -> dict[str, Any] | None:
    if isinstance(value, str):
        return None
    if not isinstance(value, dict):
        return None
    narration = _text(value.get("narration"), 420)
    visual = repair_visual(value.get("visual"))
    if not narration or visual is None:
        return None
    motion = _number(value.get("motionSeconds"))
    return {
        "purpose": _choice(
            value.get("purpose"),
            PURPOSES,
            PURPOSE_SYNONYMS,
            "demonstrate",
        ),
        "narration": narration,
        "annotation": _text(
            value.get("annotation"),
            180,
            _text(clip_title, 180, "Key idea"),
        ),
        "motionSeconds": _clamp(motion if motion is not None else 1.0, 0.35, 2.5),
        "visual": visual,
    }


def _clips(value: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    clips: list[dict[str, Any]] = []
    renamed: dict[str, str] = {}
    used: set[str] = set()
    for item in value if isinstance(value, list) else []:
        if not isinstance(item, dict):
            continue
        title = _text(item.get("title"), 140, f"Part {len(clips) + 1}")
        raw_segments = item.get("segments")
        segments = [
            segment
            for segment in (
                _segment(entry, title)
                for entry in (
                    raw_segments if isinstance(raw_segments, list) else []
                )
            )
            if segment is not None
        ][:4]
        if not segments:
            continue
        base = _slug(item.get("id"), f"part-{len(clips) + 1}")
        identifier = base
        suffix = 2
        while identifier in used:
            tail = f"-{suffix}"
            identifier = f"{base[: 64 - len(tail)]}{tail}"
            suffix += 1
        used.add(identifier)
        if isinstance(item.get("id"), str):
            renamed.setdefault(item["id"], identifier)
            renamed.setdefault(_slug(item["id"], identifier), identifier)
        clips.append(
            {
                "id": identifier,
                "teachingRole": item.get("teachingRole"),
                "title": title,
                "bigIdea": _text(item.get("bigIdea"), 220, title),
                "segments": segments,
            }
        )
    if len(clips) > 6:
        clips = [*clips[:5], clips[-1]]
    for index, clip in enumerate(clips):
        clip["step"] = index + 1
        default = (
            "orient"
            if index == 0
            else "verify-generalize"
            if index == len(clips) - 1
            else "concept"
        )
        clip["teachingRole"] = _choice(
            clip["teachingRole"],
            ROLES,
            ROLE_SYNONYMS,
            default,
        )
    return clips, renamed


def _interaction(
    value: Any,
    clip_ids: list[str],
    renamed: dict[str, str],
    fallback_id: str,
) -> dict[str, Any] | None:
    if not isinstance(value, dict) or not clip_ids:
        return None
    prompt = _text(value.get("prompt", value.get("question")), 360)
    if not prompt:
        return None
    options = []
    option_names: dict[str, str] = {}
    raw_options = value.get("options")
    for index, item in enumerate(
        raw_options if isinstance(raw_options, list) else []
    ):
        if isinstance(item, str):
            item = {"id": f"option-{index + 1}", "label": item}
        if not isinstance(item, dict):
            continue
        label = _text(item.get("label", item.get("text")), 180)
        if not label:
            continue
        identifier = _slug(item.get("id"), f"option-{index + 1}")
        if identifier in {option["id"] for option in options}:
            identifier = _slug(f"{identifier}-{index + 1}", f"option-{index + 1}")
        if isinstance(item.get("id"), str):
            option_names[item["id"]] = identifier
        options.append({"id": identifier, "label": label})
    options = options[:4]
    if len(options) < 2:
        return None
    raw_correct = value.get("correctOptionId")
    correct = (
        option_names.get(raw_correct, _slug(raw_correct, ""))
        if isinstance(raw_correct, str)
        else ""
    )
    if correct not in {option["id"] for option in options}:
        # Guessing the right answer would risk teaching something false.
        return None

    after = value.get("afterClip")
    after_clip = None
    if isinstance(after, str):
        slug = _slug(after, "")
        after_clip = renamed.get(after) or renamed.get(slug) or slug
    if after_clip not in clip_ids:
        after_clip = clip_ids[-1]
    interaction: dict[str, Any] = {
        "id": _slug(value.get("id"), fallback_id),
        "afterClip": after_clip,
        "eyebrow": _text(value.get("eyebrow"), 100, "Check the idea"),
        "prompt": prompt,
        "options": options,
        "correctOptionId": correct,
        "correctFeedback": _text(
            value.get("correctFeedback"),
            420,
            "Correct.",
        ),
        "incorrectFeedback": _text(
            value.get("incorrectFeedback"),
            420,
            "Not quite. Review the explanation and try again.",
        ),
    }
    problem = _text(value.get("problem"), 500)
    if problem:
        interaction["problem"] = problem
    return interaction


def repair_lesson_data(value: Any) -> Any:
    """Return a structurally normalized copy of a generated lesson object."""
    if not isinstance(value, dict):
        return value
    source = deepcopy(value)
    supported = _boolean(source.get("supported"), True)
    clips, renamed = _clips(source.get("clips"))
    clip_ids = [clip["id"] for clip in clips]
    title = _text(source.get("title"), 220, "Step-by-step explanation")
    problem = _text(source.get("problem"), 2_000, title)

    if not clips:
        # Nothing renderable was planned; preserve the refusal contract so the
        # caller receives one precise validation error, not a crash here.
        return {
            **source,
            "schemaVersion": 2,
            "supported": supported,
            "clips": [],
        }

    interactions = []
    raw_interactions = source.get("interactions")
    for index, item in enumerate(
        raw_interactions if isinstance(raw_interactions, list) else []
    ):
        interaction = _interaction(
            item,
            clip_ids,
            renamed,
            f"check-{index + 1}",
        )
        if interaction is not None:
            interactions.append(interaction)
    transfer = _interaction(
        source.get("transferCheck"),
        clip_ids,
        renamed,
        "transfer-check",
    ) or {**deepcopy(FALLBACK_TRANSFER_CHECK), "afterClip": clip_ids[-1]}

    completion = source.get("completion")
    completion = completion if isinstance(completion, dict) else {}
    repaired: dict[str, Any] = {
        "schemaVersion": 2,
        "supported": supported,
        "title": title,
        "problem": problem,
        "finalAnswerLatex": _latex(source.get("finalAnswerLatex"), 600),
        "learningGoal": _text(source.get("learningGoal"), 420, title),
        "teachingApproach": _text(
            source.get("teachingApproach"),
            600,
            "A guided visual explanation of the key idea and each decisive step.",
        ),
        "clips": clips,
        "interactions": interactions[:4],
        "transferCheck": transfer,
        "completion": {
            "title": _text(
                completion.get("title"),
                220,
                "You followed the full explanation.",
            ),
            "body": _text(
                completion.get("body"),
                420,
                "Review the key idea, then try a similar problem on your own.",
            ),
        },
    }
    reason = _text(source.get("unsupportedReason"), 500)
    if reason:
        repaired["unsupportedReason"] = reason
    elif not supported:
        repaired["unsupportedReason"] = (
            "The planner did not select a safe visual lesson."
        )
    return repaired

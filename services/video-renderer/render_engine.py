from __future__ import annotations

import errno
import logging
import math
import re
import shutil
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from graph_math import compile_function
from latex_clean import clean_latex, has_non_ascii, latex_to_plain_text
from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Arrow,
    Axes,
    Circle,
    Circumscribe,
    Create,
    Dot,
    FadeIn,
    FadeOut,
    Line,
    MathTex,
    NumberLine,
    Polygon,
    Rectangle,
    ReplacementTransform,
    RoundedRectangle,
    Scene,
    Text,
    TransformMatchingTex,
    VGroup,
    VMobject,
    config,
    tempconfig,
)
from models import (
    BalanceVisual,
    EquationVisual,
    GeometryVisual,
    GraphFunction,
    GraphVisual,
    LessonClip,
    LessonPlan,
    NumberLineVisual,
)
from tts import VoiceResult, probe_duration

COLORS = {
    "background": "#07111F",
    "surface": "#10283E",
    "line": "#26445F",
    "text": "#F7FAFC",
    "muted": "#AFC2D4",
    "blue": "#60A5FA",
    "teal": "#2DD4BF",
    "yellow": "#FBBF24",
    "pink": "#FB7185",
    "green": "#4ADE80",
}

LOGGER = logging.getLogger(__name__)
MEDIA_ASSEMBLY_ATTEMPTS = 2
_MANIM_RENDER_LOCK = threading.RLock()
# A scene that cannot be drawn as planned is redrawn more simply instead of
# failing the lesson: first without morphing animations, then as plain cards.
SCENE_MODES = ("full", "safe", "minimal")
GRAPH_SAMPLES = 240


@dataclass(frozen=True)
class SegmentAudio:
    path: Path
    duration_seconds: float
    transcript_similarity: float


@dataclass(frozen=True)
class RenderedClip:
    id: str
    step: int
    title: str
    duration_seconds: float
    video_path: Path
    captions_path: Path
    poster_path: Path
    transcript_similarity: float


@dataclass(frozen=True)
class RenderedScene:
    id: str
    step: int
    title: str
    duration_seconds: float
    video_path: Path
    transcript_similarity: float


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=True)


def _render_scene_movie(
    scene_type: type[Scene],
    media_root: Path,
    attempts: int = MEDIA_ASSEMBLY_ATTEMPTS,
) -> Path:
    """Scope Manim's mutable configuration to one scene and render attempt.

    Manim's file-ready callback writes the absolute movie path into the global
    output_file setting. Without clearing and restoring it, the next scene
    overwrites that movie, and a later job targets a deleted temporary folder.
    A lock also protects the global config if callers use different threads.
    """

    attempts = max(1, min(attempts, MEDIA_ASSEMBLY_ATTEMPTS))
    for attempt_index in range(attempts):
        attempt_dir = media_root / f"attempt-{attempt_index + 1}"
        if attempt_dir.exists():
            shutil.rmtree(attempt_dir)
        attempt_dir.mkdir(parents=True, exist_ok=True)
        try:
            with _MANIM_RENDER_LOCK, tempconfig(
                {"media_dir": str(attempt_dir), "output_file": ""}
            ):
                scene = scene_type()
                scene.render()
                source_path = Path(scene.renderer.file_writer.movie_file_path)
                if not source_path.resolve().is_relative_to(attempt_dir.resolve()):
                    raise RuntimeError("Manim movie escaped its render attempt")
                if not source_path.exists():
                    raise FileNotFoundError(
                        errno.ENOENT,
                        "Manim produced no movie",
                        str(source_path),
                    )
                return source_path
        except OSError as error:
            is_missing_media = getattr(error, "errno", None) == errno.ENOENT
            if not is_missing_media or attempt_index + 1 >= attempts:
                raise
            LOGGER.warning(
                "Retrying Manim media assembly after a missing fragment "
                "(attempt %s of %s)",
                attempt_index + 2,
                attempts,
            )

    raise RuntimeError("Manim media assembly exhausted its retry budget")


def _vtt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    whole_seconds, milliseconds = divmod(milliseconds, 1_000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d}.{milliseconds:03d}"


def _write_captions(
    clip: LessonClip,
    audio: list[SegmentAudio],
    destination: Path,
) -> None:
    cursor = 0.0
    lines = ["WEBVTT", ""]
    for index, (segment, voice) in enumerate(zip(clip.segments, audio), start=1):
        end = cursor + voice.duration_seconds
        lines.extend(
            [
                str(index),
                (
                    f"{_vtt_time(cursor)} --> {_vtt_time(end)} "
                    "line:92% position:50% align:center size:92%"
                ),
                segment.narration,
                "",
            ]
        )
        cursor = end
    destination.write_text("\n".join(lines), encoding="utf-8")


def _write_full_lesson_captions(
    plan: LessonPlan,
    audio_by_clip: list[list[VoiceResult]],
    scenes: list[RenderedScene],
    destination: Path,
) -> None:
    """Write one caption timeline aligned to the assembled lesson movie."""

    cue_index = 1
    scene_start = 0.0
    lines = ["WEBVTT", ""]
    for clip, voices, scene in zip(plan.clips, audio_by_clip, scenes):
        local_cursor = 0.0
        for segment, voice in zip(clip.segments, voices):
            cue_start = scene_start + local_cursor
            cue_end = cue_start + voice.duration_seconds
            lines.extend(
                [
                    str(cue_index),
                    (
                        f"{_vtt_time(cue_start)} --> {_vtt_time(cue_end)} "
                        "line:92% position:50% align:center size:92%"
                    ),
                    segment.narration,
                    "",
                ]
            )
            cue_index += 1
            local_cursor += voice.duration_seconds
        # Use the measured movie duration so Manim's transition/padding time is
        # included before the next scene's first caption.
        scene_start += scene.duration_seconds
    destination.write_text("\n".join(lines), encoding="utf-8")


def _concat_file_entry(path: Path) -> str:
    escaped = str(path.resolve()).replace("\\", "\\\\").replace("'", r"\'")
    return f"file '{escaped}'"


def _assemble_full_lesson(
    plan: LessonPlan,
    audio_by_clip: list[list[VoiceResult]],
    scenes: list[RenderedScene],
    output_dir: Path,
) -> RenderedClip:
    if not scenes:
        raise RuntimeError("renderer produced no lesson scenes")

    clips_dir = output_dir / "clips"
    posters_dir = output_dir / "posters"
    clips_dir.mkdir(parents=True, exist_ok=True)
    posters_dir.mkdir(parents=True, exist_ok=True)

    concat_path = output_dir / "lesson-scenes.txt"
    concat_path.write_text(
        "\n".join(_concat_file_entry(scene.video_path) for scene in scenes)
        + "\n",
        encoding="utf-8",
    )
    destination = clips_dir / "full-lesson.mp4"
    _run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_path),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(destination),
        ]
    )
    duration = probe_duration(destination)

    captions = clips_dir / "full-lesson.vtt"
    _write_full_lesson_captions(
        plan,
        audio_by_clip,
        scenes,
        captions,
    )
    poster = posters_dir / "full-lesson.jpg"
    _run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{max(0.1, min(1.5, duration * 0.08)):.3f}",
            "-i",
            str(destination),
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(poster),
        ]
    )

    return RenderedClip(
        id="full-lesson",
        step=1,
        title="Full explanation",
        duration_seconds=round(duration, 3),
        video_path=destination,
        captions_path=captions,
        poster_path=poster,
        transcript_similarity=min(
            scene.transcript_similarity for scene in scenes
        ),
    )


def _safe_graph_function(expression: str) -> Callable[[float], float]:
    return compile_function(expression)


_ARGUMENT_COMMAND = re.compile(
    r"\\(?:[dt]?frac|sqrt|text\w*|math\w+|operatorname|overline|underline|"
    r"vec|hat|bar|tilde|d?dot|binom|left|right|[bB]igg?[lrm]?|boxed|color|"
    r"textcolor|overset|underset|stackrel|x(?:right|left)arrow)$"
)


def _brace_depths(latex: str) -> list[int]:
    depths = []
    depth = 0
    index = 0
    while index < len(latex):
        character = latex[index]
        if character == "\\" and index + 1 < len(latex):
            depths.extend([depth, depth])
            index += 2
            continue
        if character == "}":
            depth = max(0, depth - 1)
        depths.append(depth)
        if character == "{":
            depth += 1
        index += 1
    return depths


def _isolatable_focus(
    latex: str,
    focus_latex: str | None,
) -> str | None:
    if not focus_latex or focus_latex not in latex:
        return None
    # Manim colors substrings by compiling isolated TeX fragments. Splitting
    # any part of an alignment environment leaves an unmatched environment or
    # row separator, even when the requested focus is otherwise a valid
    # literal substring. Keep multi-line equations intact.
    if any(token in latex for token in (r"\begin", r"\end", r"\\", "&")):
        return None
    if any(
        token in focus_latex
        for token in (r"\begin", r"\end", r"\\", "&")
    ):
        return None
    # Isolation cuts the formula at every occurrence. A cut inside a braced
    # argument, or right after a script or command that expects one, leaves
    # fragments TeX cannot compile (for example inside a fraction).
    depths = _brace_depths(latex)
    position = latex.find(focus_latex)
    while position != -1:
        if depths[position] != 0:
            return None
        before = latex[:position].rstrip()
        if before.endswith(("^", "_")) or _ARGUMENT_COMMAND.search(before):
            return None
        if focus_latex.startswith("{") and re.search(r"\\[A-Za-z]+$", before):
            return None
        after = latex[position + len(focus_latex) :].lstrip()
        if after.startswith(("^", "_")) and not focus_latex.rstrip().endswith("}"):
            if not re.search(r"[A-Za-z0-9)\]]$", focus_latex.rstrip()):
                return None
        position = latex.find(focus_latex, position + 1)

    unescaped = re.sub(r"\\([{}])", "", focus_latex)
    depth = 0
    for character in unescaped:
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth < 0:
                return None
    return focus_latex if depth == 0 else None


def _safe_text(value: str, **options: Any) -> Text:
    """Pango text that cannot fail on an unusual or empty string."""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", " ", value or "").strip() or "…"
    options.setdefault("color", COLORS["text"])
    for candidate in (
        cleaned,
        cleaned.encode("ascii", "ignore").decode("ascii").strip() or "…",
        "…",
    ):
        try:
            return Text(candidate, **options)
        except Exception as error:  # noqa: BLE001 - always show something.
            LOGGER.warning("Text layout failed type=%s", type(error).__name__)
    raise RuntimeError("text layout failed")


_TEXT_COMMAND = re.compile(r"\\(?:text|textbf|textit|textrm|mathrm)\s*\{")
_SPACING_ONLY = re.compile(r"^(?:\s|\\(?:quad|qquad|,|;|:|!| )|~)*$")


def _text_runs(latex: str) -> list[tuple[str, str]] | None:
    """Split a formula into math and prose at top-level text commands."""
    runs: list[tuple[str, str]] = []
    cursor = 0
    depths = _brace_depths(latex)
    for match in _TEXT_COMMAND.finditer(latex):
        if match.start() < cursor or depths[match.start()] != 0:
            continue
        depth = 1
        index = match.end()
        while index < len(latex) and depth:
            if latex[index] == "\\":
                index += 2
                continue
            depth += {"{": 1, "}": -1}.get(latex[index], 0)
            index += 1
        if depth:
            return None
        runs.append(("math", latex[cursor : match.start()]))
        runs.append(("text", latex[match.end() : index - 1]))
        cursor = index
    runs.append(("math", latex[cursor:]))
    return [
        (kind, value)
        for kind, value in runs
        if value.strip() and not (kind == "math" and _SPACING_ONLY.match(value))
    ]


def _mixed_tex(latex: str) -> VGroup | None:
    """Typeset prose in any script beside TeX math, which is ASCII-only."""
    runs = _text_runs(latex)
    if not runs or all(kind == "math" for kind, _ in runs):
        return None
    parts = VGroup()
    for kind, value in runs:
        if kind == "text":
            parts.add(_safe_text(value.strip(), font_size=34))
            continue
        if has_non_ascii(value):
            return None
        try:
            parts.add(MathTex(value.strip(), color=COLORS["text"]))
        except Exception:  # noqa: BLE001 - the caller falls back to text.
            return None
    return parts.arrange(RIGHT, buff=0.28)


def _typeset(latex: str, focus_latex: str | None) -> Any:
    source = clean_latex(latex)
    if not source:
        return _safe_text("…", font_size=34)
    if has_non_ascii(source):
        return _mixed_tex(source) or _safe_text(
            latex_to_plain_text(source),
            font_size=34,
        )
    safe_focus = _isolatable_focus(
        source,
        clean_latex(focus_latex) if focus_latex else None,
    )
    if safe_focus:
        try:
            value = MathTex(
                source,
                color=COLORS["text"],
                substrings_to_isolate=[safe_focus],
            )
            value.set_color_by_tex(safe_focus, COLORS["yellow"])
            return value
        except Exception as error:  # noqa: BLE001 - retry without the focus.
            LOGGER.warning(
                "Focused formula failed type=%s; typesetting it whole",
                type(error).__name__,
            )
    try:
        return MathTex(source, color=COLORS["text"])
    except Exception as error:  # noqa: BLE001 - never fail a lesson on TeX.
        LOGGER.warning(
            "Formula failed type=%s; showing readable text",
            type(error).__name__,
        )
    return _mixed_tex(source) or _safe_text(
        latex_to_plain_text(source),
        font_size=34,
    )


def _math_tex(
    latex: str,
    *,
    focus_latex: str | None = None,
    max_width: float = 10.8,
) -> Any:
    value = _typeset(latex, focus_latex)
    if value.width > max_width:
        value.scale_to_fit_width(max_width)
    if value.height > 2.0:
        value.scale_to_fit_height(2.0)
    return value


def _label_tex(label: str) -> Any:
    """Typeset a short label; prose stays upright with its word spacing."""
    if re.fullmatch(r"[^\W\d_][\w ,.'’-]*", label) and " " in label.strip():
        return _safe_text(label.strip(), font_size=34)
    return _math_tex(label)


def _comparison_label_color(label: str | None, fallback: str) -> str:
    lowered = (label or "").lower()
    if any(word in lowered for word in ("break", "wrong", "tempt")):
        return COLORS["pink"]
    if any(word in lowered for word in ("valid", "preserve", "correct")):
        return COLORS["green"]
    return COLORS[fallback]


def _equation_panel(
    latex: str,
    label: str | None,
    focus_latex: str | None,
    *,
    accent: str,
) -> VGroup:
    equation = _math_tex(
        latex,
        focus_latex=focus_latex,
        max_width=4.7,
    )
    card = RoundedRectangle(
        corner_radius=0.26,
        width=5.35,
        height=2.65,
        fill_color=COLORS["surface"],
        fill_opacity=0.88,
        stroke_color=accent,
        stroke_width=2,
    )
    equation.move_to(card.get_center() + DOWN * 0.15)
    group = VGroup(card, equation)
    if label:
        heading = _safe_text(
            label,
            font_size=21,
            weight="BOLD",
            color=accent,
        )
        if heading.width > 4.9:
            heading.scale_to_fit_width(4.9)
        heading.next_to(card.get_top(), DOWN, buff=0.28)
        group.add(heading)
    return group


def _equation_visual(visual: EquationVisual) -> VGroup:
    if visual.secondaryLatex:
        primary_accent = _comparison_label_color(
            visual.primaryLabel,
            "blue",
        )
        secondary_accent = _comparison_label_color(
            visual.secondaryLabel,
            "teal",
        )
        primary = _equation_panel(
            visual.latex,
            visual.primaryLabel,
            visual.focusLatex,
            accent=primary_accent,
        )
        secondary = _equation_panel(
            visual.secondaryLatex,
            visual.secondaryLabel,
            visual.secondaryFocusLatex,
            accent=secondary_accent,
        )
        return VGroup(primary, secondary).arrange(RIGHT, buff=0.5)

    equation = _math_tex(
        visual.latex,
        focus_latex=visual.focusLatex,
    )
    group = VGroup(equation)
    if visual.primaryLabel:
        heading = _safe_text(
            visual.primaryLabel,
            font_size=22,
            weight="BOLD",
            color=COLORS["teal"],
        )
        heading.next_to(equation, UP, buff=0.4)
        group.add(heading)
    if visual.emphasisLatex:
        emphasis = _math_tex(visual.emphasisLatex).scale(0.72)
        emphasis.set_color(COLORS["yellow"])
        emphasis.next_to(equation, DOWN, buff=0.4)
        group.add(emphasis)
    return group


def _axis_step(span: float, divisions: int) -> float:
    step = span / divisions
    return float(round(step)) if step >= 1 else step


def _plot_curve(
    axes: Axes,
    function: Callable[[float], float],
    x_range: tuple[float, float],
    y_range: tuple[float, float],
    color: str,
) -> VGroup:
    """Draw only the finite, visible parts of a function."""
    padding = (y_range[1] - y_range[0]) * 0.04
    runs: list[list[Any]] = []
    current: list[Any] = []
    for index in range(GRAPH_SAMPLES + 1):
        x = x_range[0] + (x_range[1] - x_range[0]) * index / GRAPH_SAMPLES
        y = function(x)
        if (
            math.isnan(y)
            or y < y_range[0] - padding
            or y > y_range[1] + padding
        ):
            if len(current) >= 2:
                runs.append(current)
            current = []
            continue
        current.append(axes.c2p(x, y))
    if len(current) >= 2:
        runs.append(current)
    curves = VGroup()
    for run in runs:
        curve = VMobject(color=color, stroke_width=4)
        curve.set_points_smoothly(run)
        curves.add(curve)
    return curves


def _graph_visual(visual: GraphVisual) -> VGroup:
    assert visual.xMin is not None
    assert visual.xMax is not None
    assert visual.yMin is not None
    assert visual.yMax is not None
    x_step = _axis_step(visual.xMax - visual.xMin, 8)
    y_step = _axis_step(visual.yMax - visual.yMin, 6)
    axes = Axes(
        x_range=[visual.xMin, visual.xMax, x_step],
        y_range=[visual.yMin, visual.yMax, y_step],
        x_length=8.6,
        y_length=4.0,
        tips=False,
        axis_config={"color": COLORS["muted"], "stroke_width": 2},
    )
    axes.shift(DOWN * 0.15)
    functions = visual.functions or [
        GraphFunction(
            expression=visual.expression or "",
            latex=visual.latex,
            color="blue",
        )
    ]
    palette = ["blue", "teal", "yellow", "pink"]
    graphs = VGroup()
    for index, item in enumerate(functions):
        color = item.color or palette[index % len(palette)]
        try:
            curve = _plot_curve(
                axes,
                _safe_graph_function(item.expression),
                (visual.xMin, visual.xMax),
                (visual.yMin, visual.yMax),
                COLORS.get(color, color),
            )
        except Exception as error:  # noqa: BLE001 - keep the other curves.
            LOGGER.warning(
                "Graph function was skipped type=%s",
                type(error).__name__,
            )
            continue
        if len(curve):
            graphs.add(curve)
    equation = _math_tex(visual.latex).scale(0.62)
    equation.to_edge(UP, buff=1.35)
    points = VGroup()
    for point in visual.points:
        point_color = point.color or "teal"
        dot = Dot(
            axes.c2p(point.x, point.y),
            color=COLORS.get(point_color, point_color),
            radius=0.07,
        )
        points.add(dot)
        if point.label:
            label = _safe_text(point.label, font_size=22)
            label.next_to(dot, UP, buff=0.12)
            points.add(label)
    group = VGroup(axes)
    for part in (graphs, points):
        if len(part):
            group.add(part)
    group.add(equation)
    return group


def _number_line_visual(visual: NumberLineVisual) -> VGroup:
    line = NumberLine(
        x_range=[visual.minimum, visual.maximum, visual.step],
        length=9.6,
        include_numbers=True,
        color=COLORS["muted"],
        font_size=25,
    )
    equation = _math_tex(visual.latex).scale(0.72)
    equation.next_to(line, UP, buff=0.8)
    points = VGroup()
    for point in visual.points:
        dot = Dot(
            line.n2p(point.value),
            color=COLORS[point.color],
            radius=0.09,
        )
        points.add(dot)
        if point.label:
            label = _safe_text(point.label, font_size=22)
            label.next_to(dot, DOWN, buff=0.2)
            points.add(label)
    group = VGroup(line, equation)
    if len(points):
        group.add(points)
    return group


def _balance_visual(visual: BalanceVisual) -> VGroup:
    beam_angle = 0 if visual.balanced else -0.08
    beam = Line(LEFT * 4.0, RIGHT * 4.0, color=COLORS["blue"], stroke_width=7)
    beam.rotate(beam_angle)
    support = Polygon(
        [-0.55, -1.45, 0],
        [0.55, -1.45, 0],
        [0, -0.35, 0],
        color=COLORS["muted"],
        fill_color=COLORS["surface"],
        fill_opacity=1,
    )
    left_pan = VGroup(
        Line([-3.2, 0, 0], [-3.2, -0.75, 0], color=COLORS["muted"]),
        Line([-4.25, -0.75, 0], [-2.15, -0.75, 0], color=COLORS["teal"]),
        _label_tex(visual.leftLabel).scale(0.58).move_to([-3.2, -1.15, 0]),
    )
    right_pan = VGroup(
        Line([3.2, 0, 0], [3.2, -0.75, 0], color=COLORS["muted"]),
        Line([2.15, -0.75, 0], [4.25, -0.75, 0], color=COLORS["teal"]),
        _label_tex(visual.rightLabel).scale(0.58).move_to([3.2, -1.15, 0]),
    )
    equation = _math_tex(visual.latex).scale(0.68)
    equation.to_edge(UP, buff=1.5)
    return VGroup(beam, support, left_pan, right_pan, equation).shift(DOWN * 0.1)


def _geometry_visual(visual: GeometryVisual) -> VGroup:
    def point(value: Any) -> list[float]:
        return [float(value.x), float(value.y), 0.0]

    shapes = VGroup()
    for shape in visual.shapes:
        color = COLORS[shape.color]
        item: Any
        if shape.type == "line" and shape.start and shape.end:
            item = Line(
                point(shape.start),
                point(shape.end),
                color=color,
                stroke_width=4,
            )
        elif shape.type == "arrow" and shape.start and shape.end:
            item = Arrow(
                point(shape.start),
                point(shape.end),
                color=color,
                stroke_width=4,
            )
        elif shape.type == "rectangle" and shape.center:
            item = Rectangle(
                width=shape.width or 2,
                height=shape.height or 1,
                color=color,
                fill_color=color,
                fill_opacity=0.12,
            ).move_to(point(shape.center))
        elif shape.type == "circle" and shape.center:
            item = Circle(
                radius=shape.radius or 1,
                color=color,
                fill_color=color,
                fill_opacity=0.1,
            ).move_to(point(shape.center))
        elif shape.type == "dot" and shape.center:
            item = Dot(
                point(shape.center),
                color=color,
                radius=shape.radius or 0.08,
            )
        else:
            # An incomplete shape is decoration; the scene continues without it.
            LOGGER.warning("Geometry shape was skipped type=%s", shape.type)
            continue
        shapes.add(item)
        if shape.label:
            label = _safe_text(shape.label, font_size=22)
            label.next_to(item, UP, buff=0.12)
            shapes.add(label)
    equation = _math_tex(visual.latex).scale(0.62)
    equation.to_edge(UP, buff=1.35)
    if not len(shapes):
        return VGroup(_math_tex(visual.latex))
    return VGroup(shapes, equation)


def _build_visual(visual: Any) -> VGroup:
    if isinstance(visual, EquationVisual):
        return _equation_visual(visual)
    if isinstance(visual, GraphVisual):
        return _graph_visual(visual)
    if isinstance(visual, NumberLineVisual):
        return _number_line_visual(visual)
    if isinstance(visual, BalanceVisual):
        return _balance_visual(visual)
    if isinstance(visual, GeometryVisual):
        return _geometry_visual(visual)
    raise ValueError("unknown visual type")


def _plain_visual(visual: Any) -> VGroup:
    """The formula alone: the simplest faithful form of any visual."""
    return VGroup(_math_tex(getattr(visual, "latex", "") or "…"))


def _resilient_visual(visual: Any, mode: str) -> VGroup:
    if mode == "minimal":
        return _plain_visual(visual)
    try:
        built = _build_visual(visual)
        if len(built.family_members_with_points()):
            return built
    except Exception as error:  # noqa: BLE001 - degrade this visual only.
        LOGGER.warning(
            "Visual kind=%s failed type=%s; showing its formula",
            getattr(visual, "kind", "unknown"),
            type(error).__name__,
        )
    return _plain_visual(visual)


def _annotation(text: str) -> VGroup:
    label = _safe_text(text, font_size=26)
    if label.width > 10.4:
        label.scale_to_fit_width(10.4)
    card = RoundedRectangle(
        corner_radius=0.22,
        width=max(5.4, label.width + 0.8),
        height=max(0.72, label.height + 0.38),
        fill_color=COLORS["surface"],
        fill_opacity=0.95,
        stroke_color=COLORS["line"],
        stroke_width=1.5,
    )
    label.move_to(card)
    # Keep the teaching annotation above the lower caption-safe zone. Web and
    # mobile players render captions outside the picture, while this spacing
    # protects the math in clients that still overlay WebVTT cues.
    return VGroup(card, label).to_edge(DOWN, buff=1.05)


def _final_answer_card(latex: str) -> VGroup:
    eyebrow = _safe_text(
        "FINAL ANSWER",
        font_size=24,
        weight="BOLD",
        color=COLORS["teal"],
    )
    answer = _math_tex(latex, max_width=10.2)
    answer.scale(1.15)
    if answer.width > 10.2:
        answer.scale_to_fit_width(10.2)
    if answer.height > 2.5:
        answer.scale_to_fit_height(2.5)
    content = VGroup(eyebrow, answer).arrange(DOWN, buff=0.42)
    card = RoundedRectangle(
        corner_radius=0.3,
        width=max(7.0, content.width + 1.2),
        height=max(2.8, content.height + 0.9),
        fill_color=COLORS["surface"],
        fill_opacity=0.98,
        stroke_color=COLORS["teal"],
        stroke_width=2.2,
    )
    content.move_to(card)
    return VGroup(card, content).shift(DOWN * 0.12)


def _transition(
    mode: str,
    previous_visual: Any | None,
    visual: Any,
    current: VGroup | None,
    upcoming: VGroup,
) -> list[Any]:
    """Choose the animation that introduces the next visual."""
    if current is None:
        if mode == "full" and visual.action in {"construct", "trace"}:
            return [Create(upcoming)]
        return [FadeIn(upcoming)]
    if mode != "full":
        # Morphing assumes matching structure; plain fades always work.
        return [FadeOut(current), FadeIn(upcoming)]
    if (
        isinstance(previous_visual, EquationVisual)
        and isinstance(visual, EquationVisual)
        and visual.action == "transform"
        and not previous_visual.secondaryLatex
        and not visual.secondaryLatex
        and previous_visual.latex != visual.latex
        and isinstance(current[0], MathTex)
        and isinstance(upcoming[0], MathTex)
    ):
        animations: list[Any] = [
            TransformMatchingTex(
                current[0],
                upcoming[0],
                transform_mismatches=True,
            )
        ]
        if len(current) > 1:
            animations.append(FadeOut(current[1:]))
        if len(upcoming) > 1:
            animations.append(FadeIn(upcoming[1:]))
        return animations
    if (
        isinstance(visual, EquationVisual)
        and visual.action == "compare"
        and visual.secondaryLatex
        and len(upcoming) >= 2
    ):
        return [
            FadeOut(current),
            FadeIn(upcoming[0], shift=RIGHT * 0.12),
            FadeIn(upcoming[1], shift=LEFT * 0.12),
        ]
    if visual.action in {"construct", "trace"}:
        return [FadeOut(current), Create(upcoming)]
    return [ReplacementTransform(current, upcoming)]


def _make_scene(
    plan: LessonPlan,
    clip: LessonClip,
    clip_index: int,
    audio: list[SegmentAudio],
    mode: str = "full",
) -> type[Scene]:
    class LessonClipScene(Scene):
        def construct(self) -> None:
            brand = _safe_text(
                "MathSolver",
                font_size=26,
                weight="BOLD",
            ).to_corner(UP + LEFT, buff=0.35)
            label = _safe_text(
                "VIDEO EXPLANATION",
                font_size=15,
                weight="BOLD",
                color=COLORS["teal"],
            ).next_to(brand, RIGHT, buff=0.35)
            step = _safe_text(
                "GUIDED EXPLANATION",
                font_size=17,
                color=COLORS["muted"],
            ).to_corner(UP + RIGHT, buff=0.42)
            title = _safe_text(
                plan.title,
                font_size=34,
                weight="BOLD",
            )
            if title.width > 11:
                title.scale_to_fit_width(11)
            title.to_edge(UP, buff=0.86)
            divider = Line(
                LEFT * 6.7,
                RIGHT * 6.7,
                color=COLORS["line"],
                stroke_width=1.5,
            ).next_to(title, DOWN, buff=0.22)
            self.add(brand, label, step, title, divider)

            current_visual: VGroup | None = None
            current_annotation: VGroup | None = None
            previous_visual: Any | None = None

            for segment, voice in zip(clip.segments, audio):
                self.add_sound(str(voice.path))
                next_visual = _resilient_visual(segment.visual, mode).shift(
                    DOWN * 0.05
                )
                next_annotation = _annotation(segment.annotation)
                run_time = min(
                    segment.motionSeconds,
                    max(0.3, voice.duration_seconds - 0.15),
                )

                animations = _transition(
                    mode,
                    previous_visual,
                    segment.visual,
                    current_visual,
                    next_visual,
                )
                if current_annotation is None:
                    animations.append(FadeIn(next_annotation, shift=UP * 0.08))
                elif mode == "full":
                    animations.append(
                        ReplacementTransform(current_annotation, next_annotation)
                    )
                else:
                    animations.extend(
                        [FadeOut(current_annotation), FadeIn(next_annotation)]
                    )

                should_signal = mode == "full" and segment.visual.action in {
                    "highlight",
                    "trace",
                }
                signal_time = min(0.45, run_time * 0.35) if should_signal else 0
                transition_time = max(0.25, run_time - signal_time)
                self.play(*animations, run_time=transition_time)
                if should_signal:
                    self.play(
                        Circumscribe(
                            next_visual,
                            color=COLORS["yellow"],
                            fade_out=True,
                        ),
                        run_time=signal_time,
                    )
                current_visual = next_visual
                current_annotation = next_annotation
                previous_visual = segment.visual
                # Keep picture and narration aligned even when the animation
                # ran longer than the planned motion time.
                remaining = voice.duration_seconds - (
                    transition_time + signal_time
                )
                if remaining > 0:
                    self.wait(remaining)
            if clip_index == len(plan.clips) - 1:
                final_answer = _final_answer_card(plan.finalAnswerLatex)
                outgoing = [
                    item
                    for item in (current_visual, current_annotation)
                    if item is not None
                ]
                self.play(
                    *(FadeOut(item) for item in outgoing),
                    FadeIn(final_answer, shift=UP * 0.12),
                    run_time=0.55,
                )
                self.wait(3.5)
            else:
                self.wait(0.4)

    return LessonClipScene


def _render_resilient_scene(
    plan: LessonPlan,
    clip: LessonClip,
    clip_index: int,
    audio: list[SegmentAudio],
    media_root: Path,
) -> Path:
    """Render a scene as planned, or in the simplest form that still works."""
    for mode in SCENE_MODES:
        try:
            return _render_scene_movie(
                _make_scene(plan, clip, clip_index, audio, mode),
                media_root / mode,
            )
        except Exception as error:  # noqa: BLE001 - simplify, then retry.
            if mode == SCENE_MODES[-1]:
                raise
            LOGGER.warning(
                "Scene %s failed in %s mode type=%s; retrying more simply",
                clip_index + 1,
                mode,
                type(error).__name__,
            )
    raise RuntimeError("scene rendering exhausted every mode")


def render_lesson_clips(
    plan: LessonPlan,
    audio_by_clip: list[list[VoiceResult]],
    output_dir: Path,
) -> list[RenderedClip]:
    scenes_dir = output_dir / "scenes"
    media_dir = output_dir / "manim"
    scenes_dir.mkdir(parents=True, exist_ok=True)
    rendered_scenes: list[RenderedScene] = []

    config.pixel_width = 1280
    config.pixel_height = 720
    config.frame_rate = 30
    config.background_color = COLORS["background"]
    config.disable_caching = True
    config.verbosity = "WARNING"

    for index, (clip, voice_results) in enumerate(
        zip(plan.clips, audio_by_clip)
    ):
        audio = [
            SegmentAudio(
                path=result.path,
                duration_seconds=result.duration_seconds,
                transcript_similarity=result.transcript_similarity,
            )
            for result in voice_results
        ]
        source_path = _render_resilient_scene(
            plan,
            clip,
            index,
            audio,
            media_dir / f"{index + 1:02d}-{clip.id}",
        )

        destination = scenes_dir / f"{index + 1:02d}-{clip.id}.mp4"
        _run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(source_path),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "21",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                str(destination),
            ]
        )
        duration = probe_duration(destination)
        rendered_scenes.append(
            RenderedScene(
                id=clip.id,
                step=clip.step,
                title=clip.title,
                duration_seconds=round(duration, 3),
                video_path=destination,
                transcript_similarity=min(
                    voice.transcript_similarity for voice in audio
                ),
            )
        )

    full_lesson = _assemble_full_lesson(
        plan,
        audio_by_clip,
        rendered_scenes,
        output_dir,
    )
    if media_dir.exists():
        shutil.rmtree(media_dir)
    return [full_lesson]

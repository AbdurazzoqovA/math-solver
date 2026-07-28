from __future__ import annotations

import ast
import errno
import logging
import math
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import sympy
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
    config,
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
    """Render one scene in fresh Manim media directories.

    Manim/PyAV can occasionally lose an intermediate partial movie while
    combining fragments. A fresh directory avoids cross-clip collisions, and
    one bounded retry recovers the transient assembly failure without
    regenerating the lesson plan or narration.
    """

    attempts = max(1, min(attempts, MEDIA_ASSEMBLY_ATTEMPTS))
    for attempt_index in range(attempts):
        attempt_dir = media_root / f"attempt-{attempt_index + 1}"
        if attempt_dir.exists():
            shutil.rmtree(attempt_dir)
        attempt_dir.mkdir(parents=True, exist_ok=True)
        config.media_dir = str(attempt_dir)
        scene = scene_type()
        try:
            scene.render()
            source_path = Path(scene.renderer.file_writer.movie_file_path)
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


ALLOWED_FUNCTIONS: dict[str, Any] = {
    "sin": sympy.sin,
    "cos": sympy.cos,
    "tan": sympy.tan,
    "sqrt": sympy.sqrt,
    "exp": sympy.exp,
    "log": sympy.log,
    "abs": sympy.Abs,
}
ALLOWED_BINARY = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
ALLOWED_UNARY = (ast.UAdd, ast.USub)


def _validate_expression_node(node: ast.AST) -> None:
    if isinstance(node, ast.Expression):
        _validate_expression_node(node.body)
        return
    if isinstance(node, ast.Constant):
        if not isinstance(node.value, (int, float)):
            raise ValueError("graph constants must be numeric")
        return
    if isinstance(node, ast.Name):
        if node.id != "x" and node.id not in ALLOWED_FUNCTIONS:
            raise ValueError("graph expression contains an unknown name")
        return
    if isinstance(node, ast.BinOp) and isinstance(node.op, ALLOWED_BINARY):
        _validate_expression_node(node.left)
        _validate_expression_node(node.right)
        return
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ALLOWED_UNARY):
        _validate_expression_node(node.operand)
        return
    if isinstance(node, ast.Call):
        if (
            not isinstance(node.func, ast.Name)
            or node.func.id not in ALLOWED_FUNCTIONS
            or len(node.args) != 1
            or node.keywords
        ):
            raise ValueError("graph function call is not allowed")
        _validate_expression_node(node.args[0])
        return
    raise ValueError("graph expression contains an unsupported operation")


def _safe_graph_function(expression: str) -> Callable[[float], float]:
    tree = ast.parse(expression.replace("^", "**"), mode="eval")
    _validate_expression_node(tree)
    symbol = sympy.Symbol("x", real=True)
    local_values = {"x": symbol, **ALLOWED_FUNCTIONS}
    compiled = compile(tree, "<safe-graph>", "eval")
    symbolic = eval(compiled, {"__builtins__": {}}, local_values)
    function = sympy.lambdify(symbol, symbolic, modules=["numpy"])

    def evaluate(value: float) -> float:
        try:
            result = float(function(value))
        except (TypeError, ValueError, ZeroDivisionError, OverflowError):
            return math.nan
        return result if math.isfinite(result) else math.nan

    return evaluate


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


def _math_tex(
    latex: str,
    *,
    focus_latex: str | None = None,
    max_width: float = 10.8,
) -> MathTex:
    safe_focus = _isolatable_focus(latex, focus_latex)
    isolated = [safe_focus] if safe_focus else []
    value = MathTex(
        latex,
        color=COLORS["text"],
        substrings_to_isolate=isolated,
    )
    if safe_focus:
        value.set_color_by_tex(safe_focus, COLORS["yellow"])
    if value.width > max_width:
        value.scale_to_fit_width(max_width)
    if value.height > 2.0:
        value.scale_to_fit_height(2.0)
    return value


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
        heading = Text(
            label,
            font_size=21,
            weight="BOLD",
            color=accent,
        )
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
        heading = Text(
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


def _graph_visual(visual: GraphVisual) -> VGroup:
    assert visual.xMin is not None
    assert visual.xMax is not None
    assert visual.yMin is not None
    assert visual.yMax is not None
    x_step = max(1.0, round((visual.xMax - visual.xMin) / 8))
    y_step = max(1.0, round((visual.yMax - visual.yMin) / 6))
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
        function = _safe_graph_function(item.expression)
        color = item.color or palette[index % len(palette)]
        graphs.add(
            axes.plot(
                function,
                x_range=[visual.xMin, visual.xMax],
                color=COLORS.get(color, color),
                stroke_width=4,
                use_smoothing=True,
                discontinuities=[],
            )
        )
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
            label = Text(point.label, font_size=22, color=COLORS["text"])
            label.next_to(dot, UP, buff=0.12)
            points.add(label)
    return VGroup(axes, graphs, points, equation)


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
            label = Text(point.label, font_size=22, color=COLORS["text"])
            label.next_to(dot, DOWN, buff=0.2)
            points.add(label)
    return VGroup(line, equation, points)


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
        _math_tex(visual.leftLabel).scale(0.58).move_to([-3.2, -1.15, 0]),
    )
    right_pan = VGroup(
        Line([3.2, 0, 0], [3.2, -0.75, 0], color=COLORS["muted"]),
        Line([2.15, -0.75, 0], [4.25, -0.75, 0], color=COLORS["teal"]),
        _math_tex(visual.rightLabel).scale(0.58).move_to([3.2, -1.15, 0]),
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
            raise ValueError(f"geometry shape is missing coordinates: {shape.type}")
        shapes.add(item)
        if shape.label:
            label = Text(shape.label, font_size=22, color=COLORS["text"])
            label.next_to(item, UP, buff=0.12)
            shapes.add(label)
    equation = _math_tex(visual.latex).scale(0.62)
    equation.to_edge(UP, buff=1.35)
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


def _annotation(text: str) -> VGroup:
    label = Text(text, font_size=26, color=COLORS["text"])
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
    eyebrow = Text(
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


def _make_scene(
    plan: LessonPlan,
    clip: LessonClip,
    clip_index: int,
    audio: list[SegmentAudio],
) -> type[Scene]:
    class LessonClipScene(Scene):
        def construct(self) -> None:
            brand = Text(
                "MathSolver",
                font_size=26,
                weight="BOLD",
                color=COLORS["text"],
            ).to_corner(UP + LEFT, buff=0.35)
            mode = Text(
                "VIDEO EXPLANATION",
                font_size=15,
                weight="BOLD",
                color=COLORS["teal"],
            ).next_to(brand, RIGHT, buff=0.35)
            step = Text(
                "GUIDED EXPLANATION",
                font_size=17,
                color=COLORS["muted"],
            ).to_corner(UP + RIGHT, buff=0.42)
            title = Text(
                plan.title,
                font_size=34,
                weight="BOLD",
                color=COLORS["text"],
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
            self.add(brand, mode, step, title, divider)

            current_visual: VGroup | None = None
            current_annotation: VGroup | None = None
            previous_visual: Any | None = None

            for segment, voice in zip(clip.segments, audio):
                self.add_sound(str(voice.path))
                next_visual = _build_visual(segment.visual).shift(DOWN * 0.05)
                next_annotation = _annotation(segment.annotation)
                run_time = min(
                    segment.motionSeconds,
                    max(0.3, voice.duration_seconds - 0.15),
                )

                animations = []
                if current_visual is None:
                    if segment.visual.action in {"construct", "trace"}:
                        animations.append(Create(next_visual))
                    else:
                        animations.append(FadeIn(next_visual))
                elif (
                    isinstance(previous_visual, EquationVisual)
                    and isinstance(segment.visual, EquationVisual)
                    and segment.visual.action == "transform"
                    and not previous_visual.secondaryLatex
                    and not segment.visual.secondaryLatex
                    and previous_visual.latex != segment.visual.latex
                ):
                    animations.append(
                        TransformMatchingTex(
                            current_visual[0],
                            next_visual[0],
                            transform_mismatches=True,
                        )
                    )
                    if len(current_visual) > 1:
                        animations.append(FadeOut(current_visual[1:]))
                    if len(next_visual) > 1:
                        animations.append(FadeIn(next_visual[1:]))
                elif (
                    isinstance(segment.visual, EquationVisual)
                    and segment.visual.action == "compare"
                    and segment.visual.secondaryLatex
                ):
                    animations.extend(
                        [
                            FadeOut(current_visual),
                            FadeIn(next_visual[0], shift=RIGHT * 0.12),
                            FadeIn(next_visual[1], shift=LEFT * 0.12),
                        ]
                    )
                elif segment.visual.action in {"construct", "trace"}:
                    animations.extend(
                        [
                            FadeOut(current_visual),
                            Create(next_visual),
                        ]
                    )
                else:
                    animations.append(
                        ReplacementTransform(current_visual, next_visual)
                    )

                if current_annotation is None:
                    animations.append(FadeIn(next_annotation, shift=UP * 0.08))
                else:
                    animations.append(
                        ReplacementTransform(current_annotation, next_annotation)
                    )

                should_signal = segment.visual.action in {
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
                remaining = voice.duration_seconds - run_time
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
        scene_type = _make_scene(plan, clip, index, audio)
        source_path = _render_scene_movie(
            scene_type,
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

"""Real TeX/Pango/Manim regressions: a flawed plan still becomes a lesson."""
from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from manim import MathTex, Text, tempconfig

from models import LessonPlan
from plan_repair import repair_lesson_data
from render_engine import (
    _graph_visual,
    _isolatable_focus,
    _math_tex,
    _resilient_visual,
    _run,
    render_lesson_clips,
)
from tts import synthesize_verified_phrase

FIXTURE = Path(__file__).resolve().parent.parent / "lesson-example.json"
SMALL_RENDER = {
    "disable_caching": True,
    "verbosity": "ERROR",
    "progress_bar": "none",
}


def contains(mobject: object, kind: type) -> bool:
    return any(isinstance(member, kind) for member in mobject.get_family())


class TypesettingTests(unittest.TestCase):
    def test_focus_inside_a_fraction_is_typeset_without_isolation(self) -> None:
        latex = r"\frac{x^2 - 9}{x^2 + 5x + 6} = \frac{(x - 3)(x + 3)}{(x + 2)(x + 3)}"
        self.assertIsNone(_isolatable_focus(latex, "(x + 3)"))
        with tempconfig(SMALL_RENDER):
            self.assertIsInstance(_math_tex(latex, focus_latex="(x + 3)"), MathTex)

    def test_focus_after_a_command_that_takes_an_argument_is_not_cut(self) -> None:
        self.assertIsNone(_isolatable_focus(r"\sqrt{x+1} = 3", "{x+1}"))
        self.assertIsNone(_isolatable_focus(r"x^2 = 9", "2"))
        self.assertEqual(
            _isolatable_focus(r"14x=-98\quad\Longrightarrow\quad x=-7", "x=-7"),
            "x=-7",
        )

    def test_uncompilable_focus_falls_back_to_the_whole_formula(self) -> None:
        with tempconfig(SMALL_RENDER):
            value = _math_tex(r"\left(1 + \frac{2}{x}\right)^x", focus_latex="(1")
        self.assertIsInstance(value, MathTex)

    def test_non_latin_text_is_typeset_beside_the_math(self) -> None:
        with tempconfig(SMALL_RENDER):
            value = _math_tex(r"x = 3 \quad \text{или} \quad x = 4")
        self.assertTrue(contains(value, MathTex))
        self.assertTrue(contains(value, Text))
        self.assertGreater(value.width, 0)

    def test_broken_tex_becomes_readable_text(self) -> None:
        with tempconfig(SMALL_RENDER):
            value = _math_tex(r"\frac{1}{2 + \undefinedcommand{3}")
        self.assertGreater(value.width, 0)
        self.assertFalse(contains(value, MathTex))

    def test_formulas_that_failed_in_production_are_typeset(self) -> None:
        cases = (
            (r"x = \frac{-2 \pm \sqrt{4 + 12}}{2}", r"\sqrt{4 + 12}"),
            (r"x = \frac{-2 \pm 4}{2}", "4"),
            (r"\sum_{n=1}^{\infty} \frac{(-1)^n}{n}", "n"),
            (r"\frac{(-1)^n}{n^2}", r"(-1)^n"),
            (r"\text{CP} = ₹ 2,400", None),
            (r"\text{CP} = \text{₹ } 2400", r"\text{₹ }"),
        )
        with tempconfig(SMALL_RENDER):
            for latex, focus in cases:
                with self.subTest(latex=latex):
                    value = _math_tex(latex, focus_latex=focus)
                    self.assertGreater(value.width, 0)
                    self.assertGreater(len(value.family_members_with_points()), 0)

    def test_percent_and_currency_do_not_truncate_a_formula(self) -> None:
        with tempconfig(SMALL_RENDER):
            value = _math_tex(r"$80 \times 25% = $20")
        self.assertIsInstance(value, MathTex)


class VisualTests(unittest.TestCase):
    def plan_with(self, visual: dict) -> LessonPlan:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["clips"][0]["segments"][0]["visual"] = visual
        return LessonPlan.model_validate(repair_lesson_data(data))

    def test_graph_with_poles_and_undefined_regions_is_drawn(self) -> None:
        plan = self.plan_with(
            {
                "kind": "graph",
                "action": "trace",
                "latex": r"y = \frac{1}{x}, \quad y = \ln x",
                "xMin": -4,
                "xMax": 4,
                "yMin": -5,
                "yMax": 5,
                "functions": [
                    {"expression": "1/x", "label": "1/x"},
                    {"expression": "ln(x)", "label": "ln x"},
                    {"expression": "2x^2 - e^x", "label": "mixed"},
                ],
            }
        )
        visual = plan.clips[0].segments[0].visual
        self.assertEqual(len(visual.functions), 3)
        with tempconfig(SMALL_RENDER):
            group = _graph_visual(visual)
        self.assertGreater(len(group.family_members_with_points()), 3)

    def test_unknown_visual_failure_shows_the_formula(self) -> None:
        class Broken:
            kind = "graph"
            latex = "y = x^2"

        with tempconfig(SMALL_RENDER):
            group = _resilient_visual(Broken(), "full")
        self.assertTrue(contains(group, MathTex))


class LessonRenderTests(unittest.TestCase):
    def test_flawed_multilingual_plan_renders_one_playable_lesson(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["title"] = "Решаем уравнение: 3x + 5 = 20"
        data["finalAnswerLatex"] = r"x = 5 \quad \text{— ответ}"
        data["clips"] = data["clips"][:2]
        first = data["clips"][0]["segments"][0]
        first["annotation"] = "Tenglamani oʻqiymiz: 3 guruh va +5"
        first["visual"] = {
            "kind": "equation",
            "action": "highlight",
            "latex": r"\frac{3x + 5}{1} = 20",
            "focusLatex": "3x",
        }
        data["clips"][1]["segments"] = data["clips"][1]["segments"][:1]
        data["clips"][1]["segments"][0]["visual"] = {
            "kind": "geometry",
            "action": "construct",
            "latex": r"\text{площадь} = 15",
            "shapes": [
                {"type": "rectangle", "center": {"x": 0, "y": 0}, "height": 0},
                {"type": "arrow", "start": {"x": 1, "y": 1}, "end": {"x": 1, "y": 1}},
                {"type": "triangle"},
            ],
        }
        data["interactions"] = []
        data["transferCheck"]["afterClip"] = "missing-clip"
        plan = LessonPlan.model_validate(
            repair_lesson_data(data),
            context={"pedagogy": "relaxed"},
        )

        previous = {
            name: os.environ.get(name)
            for name in ("VIDEO_TTS_PROVIDER", "VIDEO_VOICE_QA")
        }
        os.environ["VIDEO_TTS_PROVIDER"] = "mock"
        os.environ["VIDEO_VOICE_QA"] = "false"
        try:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / "audio").mkdir()
                audio = [
                    [
                        synthesize_verified_phrase(
                            "Short narration.",
                            root / "audio" / f"{clip.step}-{index}.wav",
                        )
                        for index, _ in enumerate(clip.segments)
                    ]
                    for clip in plan.clips
                ]
                clips = render_lesson_clips(plan, audio, root / "out")
                self.assertEqual([clip.id for clip in clips], ["full-lesson"])
                self.assertGreater(clips[0].duration_seconds, 5)
                _run(
                    [
                        "ffmpeg",
                        "-v",
                        "error",
                        "-xerror",
                        "-i",
                        str(clips[0].video_path),
                        "-f",
                        "null",
                        "-",
                    ]
                )
        finally:
            for name, value in previous.items():
                if value is None:
                    os.environ.pop(name, None)
                else:
                    os.environ[name] = value


if __name__ == "__main__":
    unittest.main()

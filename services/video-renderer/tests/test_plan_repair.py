from __future__ import annotations

import copy
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from gemini import GeminiError, GeminiValidationError
from graph_math import compile_function, is_plottable, normalize_expression
from latex_clean import clean_latex, latex_to_plain_text
from models import LessonPlan, PlanReview, RenderTask
from pipeline import (
    LessonPlanningFailed,
    UnsupportedLesson,
    _create_reviewed_plan,
)
from plan_repair import repair_lesson_data, repair_visual
from planner import PlannedLesson, _LessonParser, create_lesson_plan
from pydantic import ValidationError

FIXTURE = Path(__file__).parent.parent / "lesson-example.json"
TASK = RenderTask(schemaVersion=1, uid="student", jobId="a" * 40, attempt=1)


def example() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def plan() -> LessonPlan:
    return LessonPlan.model_validate(example())


class RepairTests(unittest.TestCase):
    def test_valid_plan_is_unchanged_in_meaning(self) -> None:
        original = LessonPlan.model_validate(example())
        repaired = LessonPlan.model_validate(repair_lesson_data(example()))
        self.assertEqual(
            original.model_dump(exclude_none=True),
            repaired.model_dump(exclude_none=True),
        )

    def test_common_contract_slips_are_repaired_without_regeneration(self) -> None:
        data = example()
        data["schemaVersion"] = "2"
        data["unexpected"] = {"anything": True}
        data["clips"][0]["step"] = 7
        data["clips"][0]["id"] = "Read The Structure!"
        data["clips"][1]["teachingRole"] = "conceptual"
        data["clips"][1]["segments"][0]["purpose"] = "explain"
        data["clips"][1]["segments"][0]["motionSeconds"] = 900
        data["clips"][1]["segments"][0]["visual"]["action"] = "emphasize"
        data["clips"][2]["segments"][1]["visual"]["shapes"][0]["height"] = 0
        data["clips"][2]["segments"][1]["visual"]["shapes"][1]["color"] = "red"
        data["clips"][3]["segments"][0]["annotation"] = "word " * 80
        data["interactions"][0]["afterClip"] = "Equality Is Balance"
        data["transferCheck"]["afterClip"] = "unknown-clip"

        repaired = LessonPlan.model_validate(repair_lesson_data(data))

        self.assertEqual([clip.step for clip in repaired.clips], [1, 2, 3, 4, 5, 6])
        self.assertEqual(repaired.clips[0].id, "read-the-structure")
        self.assertEqual(repaired.clips[1].teachingRole, "concept")
        segment = repaired.clips[1].segments[0]
        self.assertEqual(segment.purpose, "explain-why")
        self.assertEqual(segment.motionSeconds, 2.5)
        self.assertEqual(segment.visual.action, "highlight")
        self.assertLessEqual(len(repaired.clips[3].segments[0].annotation), 180)
        self.assertEqual(repaired.interactions[0].afterClip, "equality-is-balance")
        self.assertEqual(repaired.transferCheck.afterClip, "verify-and-transfer")

    def test_graph_ranges_functions_and_points_are_made_drawable(self) -> None:
        visual = repair_visual(
            {
                "kind": "plot",
                "action": "trace",
                "latex": "y = 1/x",
                "xMin": 5,
                "xMax": 5,
                "yDomain": [3, -3],
                "functions": [
                    {"fn": "1/x", "color": "red"},
                    {"expression": "__import__('os').system('id')"},
                    {"expr": "2x^2 + ln(x)", "label": "curve", "id": "Bad Id"},
                ],
                "points": [{"x": 5, "y": 0.2, "label": "on"}, {"x": 99, "y": 0}],
            }
        )
        self.assertEqual(visual["kind"], "graph")
        self.assertEqual((visual["xMin"], visual["xMax"]), (4, 6))
        self.assertEqual((visual["yMin"], visual["yMax"]), (-3, 3))
        self.assertEqual(
            [function["expression"] for function in visual["functions"]],
            ["1/x", "2*x**2 + log(x)"],
        )
        self.assertEqual(visual["functions"][0]["color"], "pink")
        self.assertEqual([point["label"] for point in visual["points"]], ["on"])

    def test_undrawable_representation_degrades_to_its_formula(self) -> None:
        for visual in (
            {"kind": "graph", "action": "trace", "latex": "x^2+y^2=1",
             "functions": [{"expression": "y**2"}]},
            {"kind": "geometry", "action": "construct", "latex": "A = bh",
             "shapes": [{"type": "triangle"}]},
            {"kind": "balance", "action": "construct", "latex": "x > 3"},
            {"kind": "hologram", "action": "spin", "latex": "x = 1"},
        ):
            with self.subTest(kind=visual["kind"]):
                repaired = repair_visual(visual)
                self.assertEqual(repaired["kind"], "equation")
                self.assertEqual(repaired["latex"], visual["latex"])

    def test_number_line_includes_its_points_and_bounds_ticks(self) -> None:
        visual = repair_visual(
            {
                "kind": "number_line",
                "action": "construct",
                "latex": "x = 250",
                "min": 0,
                "max": 100,
                "step": 0.001,
                "points": [{"value": 250, "label": "250", "color": "purple"}, 40],
            }
        )
        self.assertEqual((visual["minimum"], visual["maximum"]), (0, 250))
        self.assertLessEqual((250 - 0) / visual["step"], 30)
        self.assertEqual(visual["points"][0]["color"], "pink")
        self.assertEqual(visual["points"][1]["value"], 40)

    def test_unverifiable_interaction_is_dropped_not_guessed(self) -> None:
        data = example()
        data["interactions"][0]["correctOptionId"] = "missing"
        data["transferCheck"]["correctOptionId"] = "also-missing"
        repaired = LessonPlan.model_validate(repair_lesson_data(data))
        self.assertEqual(repaired.interactions, [])
        self.assertEqual(repaired.transferCheck.id, "verify-habit")
        self.assertEqual(repaired.transferCheck.correctOptionId, "check-original")

    def test_unsafe_tex_is_still_rejected_after_repair(self) -> None:
        data = example()
        data["clips"][0]["segments"][0]["visual"]["latex"] = r"\input{/etc/passwd}"
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(repair_lesson_data(data))
        data = example()
        data["finalAnswerLatex"] = r"\write18{id}"
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(
                repair_lesson_data(data), context={"pedagogy": "relaxed"}
            )

    def test_latex_is_cleaned_without_changing_mathematics(self) -> None:
        self.assertEqual(clean_latex("$$x² ≤ 9$$"), r"x^{2} \leq 9")
        self.assertEqual(clean_latex(r"\(√(x+1) = 3\)"), r"\sqrt{x+1} = 3")
        self.assertEqual(clean_latex("25% of $80"), r"25\% of \$80")
        self.assertEqual(
            clean_latex(r"\begin{aligned}x&=1\end{aligned}"),
            r"\begin{aligned}x&=1\end{aligned}",
        )
        self.assertEqual(
            latex_to_plain_text(r"x = \frac{7 \pm 1}{2} \quad \text{or}"),
            "x = (7 ± 1)/(2) or",
        )

    def test_commands_damaged_by_json_escapes_are_restored(self) -> None:
        damaged = json.loads(
            r'"y = 2 e^{\frac{x^2}{2}} \times \theta \neq \rho \beta \to 1"'
        )
        self.assertIn("\x0c", damaged)
        self.assertEqual(
            clean_latex(damaged),
            r"y = 2 e^{\frac{x^2}{2}} \times \theta \neq \rho \beta \to 1",
        )
        multiline = (
            r"\begin{aligned}x &= 1 \\" + "\n" + r"e^{x} &= 2\end{aligned}"
        )
        self.assertEqual(clean_latex(multiline), multiline)

    def test_graph_window_is_refit_when_it_would_hide_the_curve(self) -> None:
        visual = repair_visual(
            {
                "kind": "graph",
                "action": "trace",
                "latex": "A = 5000(1.005)^{12t}",
                "xMin": 0,
                "xMax": 10,
                "yMin": 0,
                "yMax": 1000,
                "functions": [{"expression": "5000*1.005**(12*x)", "label": "A"}],
                "points": [{"x": 10, "y": 9097, "label": "10 years"}],
            }
        )
        self.assertLess(visual["yMin"], 5000)
        self.assertGreater(visual["yMax"], 9097)
        self.assertEqual(len(visual["points"]), 1)
        plan_data = example()
        plan_data["clips"][0]["segments"][0]["visual"] = visual
        LessonPlan.model_validate(plan_data)

    def test_well_chosen_graph_window_is_kept(self) -> None:
        visual = repair_visual(
            {
                "kind": "graph",
                "action": "trace",
                "latex": "y = x^2",
                "xMin": -3,
                "xMax": 3,
                "yMin": -1,
                "yMax": 10,
                "functions": [{"expression": "x**2", "label": "x^2"}],
            }
        )
        self.assertEqual((visual["yMin"], visual["yMax"]), (-1, 10))

    def test_graph_expressions_accept_handwritten_notation_only(self) -> None:
        self.assertEqual(normalize_expression("y = 2x^2 − 3(x+1)"), "2*x**2 - 3*(x+1)")
        self.assertTrue(is_plottable("e^x + pi*sin(2x)"))
        self.assertFalse(is_plottable("x.__class__"))
        self.assertFalse(is_plottable("open('secret')"))
        self.assertFalse(is_plottable("y + 1"))
        function = compile_function("ln(x)")
        self.assertAlmostEqual(function(1), 0)
        self.assertNotEqual(function(-1), function(-1))  # NaN, not an error


class RelaxedContractTests(unittest.TestCase):
    def equation_only(self) -> dict:
        data = example()
        for clip in data["clips"]:
            for segment in clip["segments"]:
                segment["purpose"] = "demonstrate"
                segment["visual"] = {
                    "kind": "equation",
                    "action": "transform",
                    "latex": "x = 5",
                }
        data["clips"] = data["clips"][:3]
        data["interactions"] = []
        data["transferCheck"]["afterClip"] = data["clips"][-1]["id"]
        return data

    def test_teaching_rules_are_preferences_structure_is_not(self) -> None:
        data = repair_lesson_data(self.equation_only())
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data)
        relaxed = LessonPlan.model_validate(data, context={"pedagogy": "relaxed"})
        self.assertEqual(len(relaxed.clips), 3)

        data["clips"][1]["step"] = 5
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data, context={"pedagogy": "relaxed"})

    def test_parser_remembers_a_renderable_plan_while_asking_for_better(self) -> None:
        parser = _LessonParser()
        with self.assertRaises(ValidationError):
            parser(json.dumps(self.equation_only()))
        self.assertIsNotNone(parser.relaxed_plan)

        strict = parser(json.dumps(example()))
        self.assertIsInstance(strict.plan, LessonPlan)
        self.assertFalse(strict.relaxed)

    def test_parser_reports_a_declined_input_without_a_full_plan(self) -> None:
        declined = _LessonParser()(
            json.dumps({"supported": False, "unsupportedReason": "Not mathematics."})
        )
        self.assertIsNone(declined.plan)
        self.assertEqual(declined.unsupported_reason, "Not mathematics.")

    def test_exhausted_corrections_return_the_renderable_plan(self) -> None:
        relaxed_text = json.dumps(self.equation_only())

        def generate(**kwargs):
            with self.assertRaises(ValidationError):
                kwargs["parser"](relaxed_text)
            raise GeminiValidationError("contract", [{"path": "", "message": "x"}])

        with patch("planner.generate_json", side_effect=generate):
            planned = create_lesson_plan("Problem", "Solution")
        self.assertTrue(planned.relaxed)
        self.assertEqual(len(planned.plan.clips), 3)

    def test_unrenderable_output_still_reports_a_planning_failure(self) -> None:
        error = GeminiValidationError("contract", [{"path": "", "message": "x"}])
        with (
            patch("planner.generate_json", side_effect=error),
            self.assertRaises(GeminiValidationError),
        ):
            create_lesson_plan("Problem", "Solution")


@patch.dict(os.environ, {"VIDEO_PLAN_ATTEMPTS": "3"})
class PlanningLadderTests(unittest.TestCase):
    def run_ladder(self, plans: list, reviews: list):
        with (
            patch("pipeline.create_lesson_plan", side_effect=plans) as create,
            patch("pipeline.review_lesson_plan", side_effect=reviews) as review,
            patch("pipeline._update_job"),
        ):
            try:
                result = _create_reviewed_plan(TASK, "lease", "Problem", "Solution")
            except Exception as error:  # noqa: BLE001 - asserted by callers.
                result = error
        return result, create, review

    def test_teaching_objection_never_blocks_sound_mathematics(self) -> None:
        first, second = plan(), plan()
        result, create, review = self.run_ladder(
            [PlannedLesson(first), PlannedLesson(second)],
            [
                PlanReview(valid=False, mathValid=True, reason="Static cards."),
                PlanReview(valid=False, mathValid=True, reason="Still static."),
            ],
        )
        self.assertIs(result, second)
        self.assertEqual(create.call_count, 2)
        self.assertIn("Static cards.", create.call_args_list[1].kwargs["correction"])
        self.assertFalse(create.call_args_list[1].kwargs["independent"])

    def test_unreliable_solution_is_resolved_independently(self) -> None:
        rejected, resolved = plan(), plan()
        result, create, review = self.run_ladder(
            [PlannedLesson(rejected), PlannedLesson(resolved)],
            [
                PlanReview(valid=False, mathValid=False, reason="Sign error in step 2."),
                PlanReview(valid=True),
            ],
        )
        self.assertIs(result, resolved)
        self.assertTrue(create.call_args_list[1].kwargs["independent"])
        self.assertTrue(review.call_args_list[1].kwargs["independent"])

    def test_declined_input_gets_an_independent_attempt_before_refusal(self) -> None:
        declined = PlannedLesson(None, unsupported_reason="Solution incomplete.")
        resolved = plan()
        result, create, _ = self.run_ladder(
            [declined, PlannedLesson(resolved)],
            [PlanReview(valid=True)],
        )
        self.assertIs(result, resolved)
        self.assertTrue(create.call_args_list[1].kwargs["independent"])

    def test_repeated_mathematical_rejection_is_still_refused(self) -> None:
        objection = PlanReview(valid=False, mathValid=False, reason="Wrong answer.")
        result, create, _ = self.run_ladder(
            [PlannedLesson(plan()) for _ in range(3)],
            [objection, objection, objection],
        )
        self.assertIsInstance(result, UnsupportedLesson)
        self.assertEqual(create.call_count, 3)

    def test_provider_outage_is_retried_then_reported_as_retryable(self) -> None:
        recovered = plan()
        result, create, _ = self.run_ladder(
            [GeminiError("503"), PlannedLesson(recovered)],
            [PlanReview(valid=True)],
        )
        self.assertIs(result, recovered)

        result, create, _ = self.run_ladder(
            [GeminiError("503"), GeminiError("503"), GeminiError("503")],
            [],
        )
        self.assertIsInstance(result, LessonPlanningFailed)

    def test_review_outage_does_not_publish_an_unreviewed_plan(self) -> None:
        result, _, review = self.run_ladder(
            [PlannedLesson(plan()) for _ in range(3)],
            [GeminiError("503"), GeminiError("503"), GeminiError("503")],
        )
        self.assertIsInstance(result, LessonPlanningFailed)
        self.assertEqual(review.call_count, 3)

    def test_review_without_math_verdict_is_treated_as_a_math_objection(self) -> None:
        self.assertFalse(PlanReview(valid=False, reason="Unclear.").math_is_sound)
        self.assertTrue(PlanReview(valid=True).math_is_sound)
        self.assertEqual(
            len(PlanReview(valid=False, reason="r" * 900).reason), 600
        )


if __name__ == "__main__":
    unittest.main()

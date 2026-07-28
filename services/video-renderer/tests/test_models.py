from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from gemini import GeminiValidationError, _normalize_json_schema
from models import CleanupTask, LessonPlan, PlanReview, RenderTask
from pipeline import (
    LessonPlanningFailed,
    RENDER_LEASE_MS,
    _claim_decision,
    _create_reviewed_plan,
    _delivery_interactions,
    _interaction_manifest,
    _planning_attempt_limit,
)
from planner import lesson_generation_schema
from pydantic import ValidationError
from render_engine import (
    RenderedClip,
    RenderedScene,
    SegmentAudio,
    _isolatable_focus,
    _render_scene_movie,
    _safe_graph_function,
    _write_captions,
    _write_full_lesson_captions,
)
from tts import VoiceResult, _similarity

FIXTURE = Path(__file__).parent.parent / "lesson-example.json"


class LessonModelTests(unittest.TestCase):
    def test_fixture_matches_the_typed_lesson_contract(self) -> None:
        plan = LessonPlan.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
        self.assertTrue(plan.supported)
        self.assertEqual(plan.schemaVersion, 2)
        self.assertEqual(plan.finalAnswerLatex, "x = 5")
        self.assertEqual(len(plan.clips), 6)
        self.assertEqual(plan.clips[0].teachingRole, "orient")
        self.assertEqual(plan.clips[-1].teachingRole, "verify-generalize")
        self.assertEqual(plan.transferCheck.afterClip, "verify-and-transfer")

    def test_unsafe_latex_is_rejected(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["clips"][0]["segments"][0]["visual"]["latex"] = (
            r"\input{/etc/passwd}"
        )
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data)

    def test_final_answer_is_required_and_latex_safe(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data.pop("finalAnswerLatex")
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data)

        data["finalAnswerLatex"] = r"\input{/etc/passwd}"
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data)

    def test_unknown_interaction_clip_is_rejected(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["interactions"][0]["afterClip"] = "missing"
        with self.assertRaises(ValidationError):
            LessonPlan.model_validate(data)

    def test_manifest_omits_an_absent_interaction_problem(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["interactions"][0].pop("problem", None)
        plan = LessonPlan.model_validate(data)
        self.assertNotIn("problem", _interaction_manifest(plan.interactions[0]))

    def test_single_video_delivery_moves_practice_after_full_lesson(
        self,
    ) -> None:
        plan = LessonPlan.model_validate_json(
            FIXTURE.read_text(encoding="utf-8")
        )
        placeholder = Path("/tmp/full-lesson")
        clip = RenderedClip(
            id="full-lesson",
            step=1,
            title="Full explanation",
            duration_seconds=60,
            video_path=placeholder.with_suffix(".mp4"),
            captions_path=placeholder.with_suffix(".vtt"),
            poster_path=placeholder.with_suffix(".jpg"),
            transcript_similarity=1,
        )
        interactions, transfer = _delivery_interactions(plan, [clip])
        self.assertEqual(interactions, [])
        self.assertEqual(transfer["afterClip"], "full-lesson")

    def test_full_lesson_captions_include_scene_transition_time(self) -> None:
        plan = LessonPlan.model_validate_json(
            FIXTURE.read_text(encoding="utf-8")
        )
        audio_by_clip = [
            [
                VoiceResult(
                    path=Path(f"/tmp/{clip.id}-{index}.wav"),
                    duration_seconds=0.5,
                    transcript_similarity=1,
                )
                for index, _ in enumerate(clip.segments)
            ]
            for clip in plan.clips
        ]
        scenes = [
            RenderedScene(
                id=clip.id,
                step=clip.step,
                title=clip.title,
                duration_seconds=10,
                video_path=Path(f"/tmp/{clip.id}.mp4"),
                transcript_similarity=1,
            )
            for clip in plan.clips
        ]
        with tempfile.TemporaryDirectory() as work:
            destination = Path(work) / "full-lesson.vtt"
            _write_full_lesson_captions(
                plan,
                audio_by_clip,
                scenes,
                destination,
            )
            captions = destination.read_text(encoding="utf-8")
        self.assertIn("00:00:10.000 --> 00:00:10.500", captions)

    def test_render_task_rejects_non_hash_job_ids(self) -> None:
        with self.assertRaises(ValidationError):
            RenderTask(
                schemaVersion=1,
                uid="student",
                jobId="../../secret",
                attempt=1,
            )
        with self.assertRaises(ValidationError):
            CleanupTask(schemaVersion=1, uid="student", jobId="../secret")

    def test_graph_parser_allows_math_but_rejects_python_access(self) -> None:
        function = _safe_graph_function("x**2 - 5*x + 6")
        self.assertAlmostEqual(function(2), 0)
        with self.assertRaises(ValueError):
            _safe_graph_function("__import__('os').system('id')")

    def test_graph_visual_accepts_multiple_labeled_functions(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        visual = {
            "kind": "graph",
            "action": "trace",
            "xDomain": [-2, 8],
            "yDomain": [-2, 10],
            "functions": [
                {"expression": "7-x", "label": "x+y=7", "color": "#2563eb"},
                {
                    "id": "line-2",
                    "expr": "2*x-5",
                    "label": "2x-y=5",
                    "color": "#dc2626",
                },
            ],
            "points": [
                {"x": 4, "y": 3, "label": "(4, 3)", "color": "#16a34a"}
            ],
        }
        data["clips"][0]["segments"][0]["visual"] = visual
        plan = LessonPlan.model_validate(data)
        graph = plan.clips[0].segments[0].visual
        self.assertEqual(graph.kind, "graph")
        self.assertEqual(len(graph.functions), 2)
        self.assertIn("x+y=7", graph.latex)
        self.assertEqual(graph.xMin, -2)

    def test_static_step_deck_fails_the_pedagogy_gate(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        for clip in data["clips"]:
            for segment in clip["segments"]:
                segment["visual"]["action"] = "transform"
        with self.assertRaisesRegex(
            ValidationError,
            "must construct, focus, and compare",
        ):
            LessonPlan.model_validate(data)

    def test_equation_only_lesson_fails_the_pedagogy_gate(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        equation = {
            "kind": "equation",
            "action": "highlight",
            "latex": "x=5",
            "focusLatex": "x",
        }
        for clip in data["clips"]:
            for segment in clip["segments"]:
                segment["visual"] = equation
        with self.assertRaisesRegex(
            ValidationError,
            "non-equation representation",
        ):
            LessonPlan.model_validate(data)

    def test_equation_intensive_lesson_keeps_two_modeling_scenes(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        non_equation_seen = 0
        for clip in data["clips"]:
            for segment in clip["segments"]:
                if segment["visual"]["kind"] == "equation":
                    continue
                non_equation_seen += 1
                if non_equation_seen <= 2:
                    continue
                segment["visual"] = {
                    "kind": "equation",
                    "action": "highlight",
                    "latex": "3x+5=20",
                    "focusLatex": "3x",
                }

        plan = LessonPlan.model_validate(data)
        kinds = [
            segment.visual.kind
            for clip in plan.clips
            for segment in clip.segments
        ]
        self.assertEqual(kinds.count("equation"), 8)
        self.assertEqual(len(kinds) - kinds.count("equation"), 2)

    def test_one_modeling_scene_is_not_enough(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        non_equation_seen = 0
        for clip in data["clips"]:
            for segment in clip["segments"]:
                if segment["visual"]["kind"] == "equation":
                    continue
                non_equation_seen += 1
                if non_equation_seen == 1:
                    continue
                segment["visual"] = {
                    "kind": "equation",
                    "action": "highlight",
                    "latex": "3x+5=20",
                    "focusLatex": "3x",
                }

        with self.assertRaisesRegex(
            ValidationError,
            "at least two non-equation modeling scenes",
        ):
            LessonPlan.model_validate(data)

    def test_comparison_requires_two_visible_alternatives(self) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        visual = data["clips"][1]["segments"][1]["visual"]
        visual.pop("secondaryLatex")
        with self.assertRaisesRegex(
            ValidationError,
            "comparison needs secondaryLatex",
        ):
            LessonPlan.model_validate(data)

    def test_number_line_accepts_common_min_max_names_and_derives_ticks(
        self,
    ) -> None:
        data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        data["clips"][2]["segments"][1]["visual"] = {
            "kind": "number-line",
            "action": "construct",
            "latex": "x=-7",
            "min": -10,
            "max": 0,
            "points": [
                {"value": -7, "label": "-7", "color": "teal"},
            ],
        }
        plan = LessonPlan.model_validate(data)
        visual = plan.clips[2].segments[1].visual
        self.assertEqual(visual.kind, "number-line")
        self.assertEqual(visual.minimum, -10)
        self.assertEqual(visual.maximum, 0)
        self.assertEqual(visual.step, 1)

    def test_render_lease_claims_queued_work(self) -> None:
        self.assertEqual(_claim_decision("queued", 100, 200), "claim")

    def test_render_lease_defers_recent_active_work(self) -> None:
        self.assertEqual(
            _claim_decision("rendering", 1_000, 1_000 + RENDER_LEASE_MS - 1),
            "busy",
        )

    def test_render_lease_reclaims_stale_active_work(self) -> None:
        self.assertEqual(
            _claim_decision("rendering", 1_000, 1_000 + RENDER_LEASE_MS),
            "claim",
        )

    def test_render_lease_ignores_terminal_work(self) -> None:
        for status in ("ready", "unsupported", "failed"):
            with self.subTest(status=status):
                self.assertEqual(_claim_decision(status, 1_000, 2_000), "ignore")

    def test_planning_recovery_is_bounded(self) -> None:
        with patch.dict(os.environ, {"VIDEO_PLAN_ATTEMPTS": "12"}):
            self.assertEqual(_planning_attempt_limit(), 3)
        with patch.dict(os.environ, {"VIDEO_PLAN_ATTEMPTS": "invalid"}):
            self.assertEqual(_planning_attempt_limit(), 2)

    def test_invalid_generated_plans_receive_bounded_correction(self) -> None:
        task = RenderTask(
            schemaVersion=1,
            uid="student",
            jobId="a" * 40,
            attempt=1,
        )
        error = GeminiValidationError(
            "invalid lesson contract",
            [{"path": "", "message": "needs two modeling scenes"}],
        )
        with (
            patch.dict(os.environ, {"VIDEO_PLAN_ATTEMPTS": "2"}),
            patch(
                "pipeline.create_lesson_plan",
                side_effect=error,
            ) as create,
            patch("pipeline._update_job"),
            self.assertRaises(LessonPlanningFailed),
        ):
            _create_reviewed_plan(
                task,
                "lease",
                "Solve x.",
                "x equals one.",
            )

        self.assertEqual(create.call_count, 2)
        self.assertIsNone(create.call_args_list[0].kwargs["correction"])
        self.assertIn(
            "needs two modeling scenes",
            create.call_args_list[1].kwargs["correction"],
        )

    def test_gemini_schema_uses_only_supported_constraints(self) -> None:
        schema = _normalize_json_schema(LessonPlan.model_json_schema())
        encoded = json.dumps(schema)
        for unsupported in (
            '"const"',
            '"oneOf"',
            '"discriminator"',
            '"exclusiveMinimum"',
            '"maxLength"',
        ):
            with self.subTest(keyword=unsupported):
                self.assertNotIn(unsupported, encoded)
        self.assertIn('"$defs"', encoded)
        self.assertIn('"anyOf"', encoded)

    def test_lesson_generation_schema_is_compact_and_non_union(self) -> None:
        encoded = json.dumps(lesson_generation_schema())
        self.assertLess(len(encoded), 9_000)
        for keyword in ('"$ref"', '"$defs"', '"anyOf"', '"oneOf"', '"const"'):
            with self.subTest(keyword=keyword):
                self.assertNotIn(keyword, encoded)

    def test_valid_review_may_omit_reason_but_rejection_may_not(self) -> None:
        self.assertTrue(PlanReview(valid=True).valid)
        with self.assertRaises(ValidationError):
            PlanReview(valid=False)

    def test_voice_similarity_normalizes_spoken_math(self) -> None:
        expected = (
            "Adding the equations cancels y, leaving three x equals twelve."
        )
        transcript = "Adding the equations cancels Y, leaving 3x = 12."
        self.assertGreater(_similarity(expected, transcript), 0.95)

    def test_voice_similarity_normalizes_signed_fractions(self) -> None:
        expected = "x equals negative twelve over thirty-five."
        transcript = "X = -12/35."
        self.assertEqual(_similarity(expected, transcript), 1.0)

    def test_focus_is_isolated_only_when_it_is_safe_and_literal(self) -> None:
        self.assertEqual(
            _isolatable_focus(
                r"14x=-98\quad\Longrightarrow\quad x=-7",
                "x=-7",
            ),
            "x=-7",
        )
        self.assertIsNone(
            _isolatable_focus(
                r"(2x+3y)-(-12x+3y)=1-99",
                "3y-3y",
            )
        )
        self.assertIsNone(_isolatable_focus(r"\frac{x}{2}=3", r"\frac{x"))
        self.assertIsNone(
            _isolatable_focus(
                r"\begin{aligned}x&=3\end{aligned}",
                r"\begin{aligned}x&=3\end{aligned}",
            )
        )
        self.assertIsNone(
            _isolatable_focus(
                r"\begin{aligned}x+y&=3\\x-y&=1\end{aligned}",
                "x+y",
            )
        )

    def test_webvtt_cues_use_the_caption_safe_zone(self) -> None:
        plan = LessonPlan.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
        clip = plan.clips[0]
        audio = [
            SegmentAudio(
                path=Path("/tmp/unused.wav"),
                duration_seconds=2.5,
                transcript_similarity=1.0,
            )
        ]
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "captions.vtt"
            _write_captions(clip, audio, destination)
            captions = destination.read_text(encoding="utf-8")
        self.assertIn(
            "line:92% position:50% align:center size:92%",
            captions,
        )

    def test_missing_manim_fragment_retries_in_a_fresh_directory(self) -> None:
        attempts = 0

        class FakeFileWriter:
            movie_file_path = ""

        class FakeRenderer:
            file_writer = FakeFileWriter()

        class FakeScene:
            renderer = FakeRenderer()

            def render(self) -> None:
                nonlocal attempts
                from manim import config

                attempts += 1
                movie = Path(config.media_dir) / "movie.mp4"
                self.renderer.file_writer.movie_file_path = str(movie)
                if attempts == 1:
                    raise FileNotFoundError(2, "missing partial movie")
                movie.write_bytes(b"rendered")

        with tempfile.TemporaryDirectory() as directory:
            movie = _render_scene_movie(
                FakeScene,
                Path(directory) / "clip",
            )

        self.assertEqual(attempts, 2)
        self.assertIn("attempt-2", str(movie))

    def test_non_media_render_error_is_not_retried(self) -> None:
        attempts = 0

        class BrokenScene:
            def render(self) -> None:
                nonlocal attempts
                attempts += 1
                raise ValueError("invalid scene")

        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "invalid scene"):
                _render_scene_movie(
                    BrokenScene,
                    Path(directory) / "clip",
                )

        self.assertEqual(attempts, 1)


if __name__ == "__main__":
    unittest.main()

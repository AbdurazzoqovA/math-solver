from __future__ import annotations

import copy
import json
import os
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from llm import LLMError, LLMRequestError, LLMValidationError, generate_json
from models import LessonPlan, PlanReview
from planner import create_lesson_plan

ENV = {
    "LLM_PROVIDER": "azure",
    "AZURE_LLM_ENDPOINT": "https://example.services.ai.azure.com/openai/v1/responses",
    "AZURE_LLM_API_KEY": "test-llm-key",
    "AZURE_LLM_DEPLOYMENT": "gpt-5-mini",
}


def response(text: str, status: str = "completed") -> Mock:
    result = Mock(ok=True, status_code=200)
    result.json.return_value = {
        "status": status,
        "output": [
            {"type": "message", "content": [{"type": "output_text", "text": text}]}
        ],
    }
    return result


@patch.dict(os.environ, ENV, clear=True)
class AzurePlanningTests(unittest.TestCase):
    def generate(self, **kwargs):
        return generate_json(
            system_instruction="Return JSON.",
            prompt="Check the math.",
            model_type=PlanReview,
            **kwargs,
        )

    def test_strict_review_is_private_and_uses_deployment_and_reasoning_budget(self):
        with patch(
            "llm.requests.post", return_value=response('{"valid":true,"reason":""}')
        ) as send:
            result = self.generate(max_output_tokens=1000)
        self.assertTrue(result.valid)
        self.assertEqual(send.call_args.args[0], ENV["AZURE_LLM_ENDPOINT"])
        payload = send.call_args.kwargs["json"]
        self.assertEqual(payload["model"], "gpt-5-mini")
        self.assertFalse(payload["store"])
        self.assertNotIn("temperature", payload)
        self.assertEqual(payload["reasoning"], {"effort": "low"})
        self.assertEqual(payload["max_output_tokens"], 5000)
        schema = payload["text"]["format"]["schema"]
        self.assertEqual(set(schema["required"]), {"valid", "reason"})
        self.assertFalse(schema["additionalProperties"])

    def test_nano_deployment_and_default_omit_reasoning_parameters(self):
        for deployment in ("gpt-4.1-nano", ""):
            with (
                self.subTest(deployment=deployment),
                patch.dict(os.environ, {"AZURE_LLM_DEPLOYMENT": deployment}),
                patch(
                    "llm.requests.post",
                    return_value=response('{"valid":true,"reason":""}'),
                ) as send,
            ):
                self.assertTrue(
                    self.generate(temperature=0.2, max_output_tokens=1000).valid
                )
                payload = send.call_args.kwargs["json"]
                self.assertEqual(payload["model"], "gpt-4.1-nano")
                self.assertNotIn("reasoning", payload)
                self.assertEqual(payload["temperature"], 0.2)
                self.assertEqual(payload["max_output_tokens"], 1000)

    def test_complex_plan_uses_json_mode_with_authoritative_local_validation(self):
        with patch(
            "llm.requests.post", return_value=response('{"valid":true,"reason":""}')
        ) as send:
            self.generate(response_schema=False)
        self.assertEqual(
            send.call_args.kwargs["json"]["text"]["format"], {"type": "json_object"}
        )

    def test_video_provider_overrides_web_provider_for_plan_and_review(self):
        for video_provider, global_provider in (("gemini", "azure"), ("azure", "gemini")):
            with (
                self.subTest(provider=video_provider),
                patch.dict(os.environ, {"VIDEO_LLM_PROVIDER": video_provider, "LLM_PROVIDER": global_provider}),
                patch("llm.generate_gemini_json", return_value=PlanReview(valid=True)) as gemini,
                patch("llm.requests.post", return_value=response('{"valid":true,"reason":""}')) as azure,
            ):
                self.assertTrue(self.generate().valid)
                self.assertEqual(gemini.call_count, int(video_provider == "gemini"))
                self.assertEqual(azure.call_count, int(video_provider == "azure"))

    def test_schema_does_not_weaken_local_safety_or_bounds(self):
        example = json.loads((Path(__file__).parent.parent / "lesson-example.json").read_text())
        for mutation in ("unsafe", "bounds"):
            invalid = copy.deepcopy(example)
            if mutation == "unsafe":
                invalid["finalAnswerLatex"] = r"\input{private}"
            else:
                invalid["clips"][0]["segments"][0]["motionSeconds"] = 900
            with (
                self.subTest(mutation=mutation),
                patch("llm.requests.post", return_value=response(json.dumps(invalid))),
                self.assertRaises(LLMValidationError),
            ):
                generate_json(system_instruction="JSON", prompt="Plan", model_type=LessonPlan, retries=1)

    def test_gemini_lesson_retains_json_mode(self):
        with (
            patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}),
            patch("planner.generate_json") as generate,
        ):
            create_lesson_plan("Problem", "Solution", correction="x" * 700 + "last error")
        self.assertIs(generate.call_args.kwargs["response_schema"], False)
        self.assertIn("last error", generate.call_args.kwargs["prompt"])

    def test_invalid_plan_receives_feedback_then_retries(self):
        payloads = []

        def send(_url, **kwargs):
            payloads.append(copy.deepcopy(kwargs["json"]))
            return response(
                '{"valid":false,"reason":""}'
                if len(payloads) == 1
                else '{"valid":true,"reason":""}'
            )

        with patch("llm.requests.post", side_effect=send), patch("llm.time.sleep"):
            result = self.generate(retries=2)
        self.assertTrue(result.valid)
        self.assertIn("previous_output_validation_errors", payloads[1]["input"])

    def test_exhausted_schema_failure_keeps_pipeline_error_classification(self):
        with (
            patch(
                "llm.requests.post",
                return_value=response('{"valid":false,"reason":""}'),
            ),
            self.assertRaises(LLMValidationError) as error,
        ):
            self.generate(retries=1)
        self.assertTrue(error.exception.feedback)

    def test_incomplete_output_is_not_accepted(self):
        with (
            patch(
                "llm.requests.post",
                return_value=response('{"valid":true,"reason":""}', "incomplete"),
            ),
            self.assertRaises(LLMError),
        ):
            self.generate(retries=1)

    def test_non_retryable_errors_do_not_expose_response_body(self):
        failure = Mock(ok=False, status_code=401)
        failure.json.return_value = {
            "error": {"message": "private content test-llm-key"}
        }
        with (
            patch("llm.requests.post", return_value=failure) as send,
            self.assertRaisesRegex(
                LLMRequestError, r"^Azure LLM request failed \(401\)$"
            ),
        ):
            self.generate()
        send.assert_called_once()
        failure.json.assert_not_called()

    def test_gemini_rollback_does_not_call_azure(self):
        with (
            patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}),
            patch(
                "llm.generate_gemini_json", return_value=PlanReview(valid=True)
            ) as gemini,
            patch("llm.requests.post") as azure,
        ):
            self.assertTrue(self.generate().valid)
        gemini.assert_called_once()
        azure.assert_not_called()


if __name__ == "__main__":
    unittest.main()

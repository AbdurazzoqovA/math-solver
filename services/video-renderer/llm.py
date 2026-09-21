"""Switchable lesson planning/review; audio transcription stays in gemini.py."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Literal, TypeVar
from urllib.parse import urlsplit

import requests
from gemini import (
    GeminiError as LLMError,
)
from gemini import (
    GeminiRequestError as LLMRequestError,
)
from gemini import (
    GeminiValidationError as LLMValidationError,
)
from gemini import (
    dump_for_prompt,
)
from gemini import (
    generate_json as generate_gemini_json,
)
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)
LOGGER = logging.getLogger("video-renderer.llm")


def lesson_provider() -> str:
    """Keep complex lesson planning independent from the web's solver model."""
    return (
        os.environ.get("VIDEO_LLM_PROVIDER")
        or os.environ.get("LLM_PROVIDER", "gemini")
    ).strip().lower()


def _strict_schema(value: Any) -> Any:
    if isinstance(value, list):
        return [_strict_schema(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {}
    for key, item in value.items():
        if key in {"default", "title", "discriminator"}:
            continue
        if key in {"properties", "$defs"}:
            result[key] = {
                name: _strict_schema(schema) for name, schema in item.items()
            }
        elif key == "oneOf":
            result["anyOf"] = _strict_schema(item)
        else:
            result[key] = _strict_schema(item)
    if result.get("type") == "object":
        result["additionalProperties"] = False
        result["required"] = list(result.get("properties", {}))
    return result


def generate_json(
    *,
    system_instruction: str,
    prompt: str,
    model_type: type[T],
    response_schema: dict[str, Any] | Literal[False] | None = None,
    temperature: float = 0.15,
    max_output_tokens: int = 8_000,
    retries: int = 3,
) -> T:
    provider = lesson_provider()
    if provider == "gemini":
        return generate_gemini_json(
            system_instruction=system_instruction,
            prompt=prompt,
            model_type=model_type,
            response_schema=response_schema,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            retries=retries,
        )
    if provider != "azure":
        raise LLMRequestError("LLM_PROVIDER must be azure or gemini")
    api_key = os.environ.get("AZURE_LLM_API_KEY", "").strip()
    endpoint = os.environ.get("AZURE_LLM_ENDPOINT", "").strip()
    if not api_key:
        raise LLMRequestError("AZURE_LLM_API_KEY is not configured")
    parsed = urlsplit(endpoint)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
        or not parsed.path.endswith("/openai/v1/responses")
    ):
        raise LLMRequestError(
            "AZURE_LLM_ENDPOINT must be a complete HTTPS Responses URL"
        )
    text_format = (
        {"type": "json_object"}
        if response_schema is False
        else {
            "type": "json_schema",
            "name": model_type.__name__,
            "strict": True,
            "schema": _strict_schema(response_schema or model_type.model_json_schema()),
        }
    )
    model = os.environ.get("AZURE_LLM_DEPLOYMENT") or "gpt-4.1-nano"
    uses_reasoning = model.startswith("gpt-5")
    payload = {
        "model": model,
        "instructions": system_instruction,
        "input": f"{prompt}\n\nReturn a valid JSON object."
        if response_schema is False
        else prompt,
        "store": False,
        # GPT-4.1 has no reasoning parameter; keep GPT-5 rollback compatible.
        **(
            {"reasoning": {"effort": "low"}}
            if uses_reasoning
            else {"temperature": temperature}
        ),
        "max_output_tokens": max_output_tokens + (4_000 if uses_reasoning else 0),
        "text": {"format": text_format},
    }
    validation_feedback: list[dict[str, str]] = []
    validation_failed = False
    retries = max(1, min(retries, 3))
    for attempt in range(retries):
        try:
            response = requests.post(
                endpoint,
                json=payload,
                headers={"api-key": api_key},
                timeout=(15, 150),
            )
            if response.status_code == 429 or response.status_code >= 500:
                raise LLMError("Azure LLM temporarily unavailable")
            if not response.ok:
                raise LLMRequestError(
                    f"Azure LLM request failed ({response.status_code})"
                )
            body = response.json()
            if body.get("status") != "completed":
                raise LLMError("Azure LLM response did not complete")
            text = "".join(
                part.get("text", "")
                for item in body.get("output", [])
                if item.get("type") == "message"
                for part in item.get("content", [])
                if part.get("type") == "output_text"
            )
            if not text:
                raise LLMError("Azure LLM returned no structured output")
            return model_type.model_validate_json(text)
        except LLMRequestError:
            raise
        except ValidationError as error:
            validation_failed = True
            LOGGER.warning(
                "Structured generation rejected provider=azure schema=%s "
                "attempt=%s error_types=%s",
                model_type.__name__,
                attempt + 1,
                ",".join(sorted({item["type"] for item in error.errors()})),
            )
            validation_feedback = [
                {
                    "path": ".".join(str(part) for part in item["loc"]),
                    "message": item["msg"],
                }
                for item in error.errors(include_url=False, include_input=False)[:12]
            ]
            payload["input"] = (
                f"{prompt}\n\n<previous_output_validation_errors>\n"
                f"{dump_for_prompt(validation_feedback)}\n"
                "</previous_output_validation_errors>\n"
                "Generate the complete JSON object again and correct every listed structural error."
            )
        except (requests.RequestException, ValueError, LLMError):
            # No provider bodies, prompts, or credentials in errors or logs.
            validation_failed = False
        if attempt + 1 < retries:
            time.sleep(2**attempt)
    if validation_failed:
        raise LLMValidationError(
            "Azure LLM output did not satisfy the lesson contract", validation_feedback
        )
    raise LLMError("Azure LLM structured generation failed after retries")

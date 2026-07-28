from __future__ import annotations

import json
import os
import time
from typing import Any, Literal, TypeVar

import requests
from pydantic import BaseModel, ValidationError


T = TypeVar("T", bound=BaseModel)
API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"
INTERACTIONS_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/interactions"
)
DEFAULT_MODEL = "gemini-3.6-flash"


class GeminiError(RuntimeError):
    pass


class GeminiRequestError(GeminiError):
    pass


class GeminiValidationError(GeminiError):
    def __init__(
        self,
        message: str,
        feedback: list[dict[str, str]],
    ) -> None:
        super().__init__(message)
        self.feedback = feedback


SUPPORTED_SCHEMA_KEYS = {
    "$ref",
    "additionalProperties",
    "anyOf",
    "description",
    "enum",
    "format",
    "items",
    "maximum",
    "maxItems",
    "minimum",
    "minItems",
    "prefixItems",
    "properties",
    "required",
    "type",
}


def _normalize_json_schema(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_json_schema(item) for item in value]
    if not isinstance(value, dict):
        return value

    normalized: dict[str, Any] = {}
    for key, item in value.items():
        if key == "$defs":
            normalized[key] = {
                name: _normalize_json_schema(definition)
                for name, definition in item.items()
            }
        elif key == "properties":
            normalized[key] = {
                name: _normalize_json_schema(definition)
                for name, definition in item.items()
            }
        elif key == "const":
            normalized["enum"] = [item]
        elif key == "oneOf":
            normalized["anyOf"] = _normalize_json_schema(item)
        elif key == "exclusiveMinimum":
            # Gemini's supported subset accepts minimum; Pydantic remains the
            # authoritative validator and will still enforce strict bounds.
            normalized["minimum"] = item
        elif key in SUPPORTED_SCHEMA_KEYS:
            normalized[key] = _normalize_json_schema(item)
    return normalized


def _api_key() -> str:
    value = os.environ.get("GOOGLE_CLOUD_API_KEY", "").strip()
    if not value:
        raise GeminiError("GOOGLE_CLOUD_API_KEY is not configured")
    return value


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
    model = os.environ.get("VIDEO_PLANNER_MODEL", DEFAULT_MODEL)
    schema = (
        None
        if response_schema is False
        else response_schema
        or _normalize_json_schema(model_type.model_json_schema())
    )
    response_format: dict[str, Any] = {
        "type": "text",
        "mime_type": "application/json",
    }
    if schema is not None:
        response_format["schema"] = schema
    payload: dict[str, Any] = {
        "model": model,
        "system_instruction": system_instruction,
        "input": prompt,
        # Math problems should not become resumable server-side conversations.
        "store": False,
        "response_format": response_format,
        "generation_config": {
            "max_output_tokens": max_output_tokens,
            "thinking_level": "low",
        },
    }

    last_error: Exception | None = None
    validation_feedback: list[dict[str, str]] = []
    for attempt in range(retries):
        try:
            response = requests.post(
                INTERACTIONS_ENDPOINT,
                json=payload,
                headers={
                    "x-goog-api-key": _api_key(),
                    "Api-Revision": "2026-05-20",
                },
                timeout=(15, 150),
            )
            if response.status_code >= 500 or response.status_code == 429:
                raise GeminiError(f"Gemini temporary error ({response.status_code})")
            if not response.ok:
                try:
                    detail = str(response.json().get("error", {}).get("message", ""))
                except ValueError:
                    detail = ""
                detail = " ".join(detail.split())[:600]
                suffix = f": {detail}" if detail else ""
                raise GeminiRequestError(
                    f"Gemini request failed ({response.status_code}){suffix}"
                )
            body = response.json()
            text = ""
            for step in reversed(body.get("steps", [])):
                if step.get("type") != "model_output":
                    continue
                for content in reversed(step.get("content", [])):
                    if content.get("type") == "text" and content.get("text"):
                        text = str(content["text"])
                        break
                if text:
                    break
            if not text:
                raise GeminiError("Gemini returned no structured plan")
            return model_type.model_validate_json(text)
        except GeminiRequestError:
            raise
        except ValidationError as error:
            last_error = error
            validation_feedback = [
                {
                    "path": ".".join(str(part) for part in item["loc"]),
                    "message": item["msg"],
                }
                for item in error.errors(
                    include_url=False,
                    include_input=False,
                )[:12]
            ]
            if attempt + 1 < retries:
                payload["input"] = (
                    f"{prompt}\n\n"
                    "<previous_output_validation_errors>\n"
                    f"{dump_for_prompt(validation_feedback)}\n"
                    "</previous_output_validation_errors>\n"
                    "Generate the complete JSON object again and correct every "
                    "listed structural error."
                )
                time.sleep(2**attempt)
                continue
            break
        except (requests.RequestException, ValueError, GeminiError) as error:
            last_error = error
            if attempt + 1 < retries:
                time.sleep(2**attempt)
                continue
            break
    if isinstance(last_error, ValidationError):
        raise GeminiValidationError(
            "Gemini returned a plan that did not satisfy the lesson contract",
            validation_feedback,
        )
    raise GeminiError(f"Gemini structured generation failed: {last_error}")


def transcribe_audio(audio: bytes, *, mime_type: str = "audio/wav") -> str:
    import base64

    model = os.environ.get("VIDEO_QA_MODEL", DEFAULT_MODEL)
    url = f"{API_ROOT}/{model}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Transcribe this math narration exactly. Spell out "
                            "variables, operators, and numbers as spoken words; "
                            "do not use mathematical symbols or digits. Return "
                            "only the spoken words, with no commentary."
                        )
                    },
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64.b64encode(audio).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 800},
    }
    response = requests.post(
        url,
        params={"key": _api_key()},
        json=payload,
        timeout=(15, 150),
    )
    if not response.ok:
        raise GeminiError(f"Gemini transcription failed ({response.status_code})")
    body = response.json()
    return (
        body.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
        .strip()
    )


def dump_for_prompt(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

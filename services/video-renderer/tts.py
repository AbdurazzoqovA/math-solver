from __future__ import annotations

import base64
import json
import math
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
import wave
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from gemini import transcribe_audio


TTS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview"
WORD_PATTERN = re.compile(r"[a-z]+|\d+(?:\.\d+)?")
SMALL_NUMBERS = (
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
)
TENS = (
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
)


@dataclass(frozen=True)
class VoiceResult:
    path: Path
    duration_seconds: float
    transcript_similarity: float


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=True)


def probe_duration(path: Path) -> float:
    result = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=duration",
            "-of",
            "json",
            str(path),
        ]
    )
    data = json.loads(result.stdout)
    candidates = [data.get("format", {}).get("duration")]
    candidates.extend(
        stream.get("duration") for stream in data.get("streams", [])
    )
    for candidate in candidates:
        try:
            duration = float(candidate)
        except (TypeError, ValueError):
            continue
        if duration > 0:
            return duration
    raise RuntimeError("Could not determine audio duration")


def _find_audio_data(node: Any) -> bytes | None:
    if isinstance(node, dict):
        output_audio = node.get("output_audio")
        if isinstance(output_audio, dict) and isinstance(
            output_audio.get("data"), str
        ):
            return base64.b64decode(output_audio["data"])
        mime_type = str(node.get("mime_type") or node.get("mimeType") or "")
        if isinstance(node.get("data"), str) and (
            node.get("type") == "audio" or mime_type.startswith("audio/")
        ):
            return base64.b64decode(node["data"])
        for value in node.values():
            found = _find_audio_data(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find_audio_data(value)
            if found is not None:
                return found
    return None


def _write_wave(path: Path, audio: bytes) -> None:
    if audio.startswith(b"RIFF"):
        path.write_bytes(audio)
        return
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(audio)


def _mock_wave(path: Path, narration: str) -> None:
    duration = max(1.5, min(6.0, len(narration.split()) / 2.5))
    sample_rate = 24_000
    frame_count = round(duration * sample_rate)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        frames = bytearray()
        for index in range(frame_count):
            # A very quiet tone makes the development asset a valid audio stream.
            value = round(240 * math.sin(index * 2 * math.pi * 220 / sample_rate))
            frames.extend(int(value).to_bytes(2, "little", signed=True))
        output.writeframes(bytes(frames))


def _gemini_tts(narration: str, destination: Path) -> None:
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GOOGLE_CLOUD_API_KEY is not configured")
    voice_name = os.environ.get("VIDEO_TTS_VOICE", "Sulafat")
    style = os.environ.get(
        "VIDEO_TTS_STYLE",
        (
            "Warm, precise, patient math tutor. Speak naturally at a focused "
            "teaching pace. Pronounce variables, signs and numbers crisply. "
            "Do not sound theatrical."
        ),
    )
    prompt = (
        "Speak only the text between <script> and </script>, exactly once. "
        "Begin immediately and stop after the final word. Do not repeat, add, "
        "omit, paraphrase, or speak instructions or tags.\n\n"
        f"Silent voice direction: {style}\n\n"
        f"<script>{narration}</script>"
    )
    payload = {
        "model": os.environ.get("VIDEO_TTS_MODEL", DEFAULT_TTS_MODEL),
        "input": prompt,
        "store": False,
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice_name}]},
    }
    request = urllib.request.Request(
        TTS_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
            "Api-Revision": "2026-05-20",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.read()
        raise RuntimeError(f"Gemini TTS failed ({error.code})") from error
    audio = _find_audio_data(body)
    if not audio:
        raise RuntimeError("Gemini TTS returned no audio")
    _write_wave(destination, audio)


def _integer_words(value: int) -> list[str]:
    if value < 20:
        return [SMALL_NUMBERS[value]]
    if value < 100:
        quotient, remainder = divmod(value, 10)
        return [TENS[quotient], *(_integer_words(remainder) if remainder else [])]
    if value < 1_000:
        quotient, remainder = divmod(value, 100)
        return [
            *_integer_words(quotient),
            "hundred",
            *(_integer_words(remainder) if remainder else []),
        ]
    if value < 1_000_000:
        quotient, remainder = divmod(value, 1_000)
        return [
            *_integer_words(quotient),
            "thousand",
            *(_integer_words(remainder) if remainder else []),
        ]
    return [SMALL_NUMBERS[int(digit)] for digit in str(value)]


def _number_token_words(token: str) -> list[str]:
    whole, separator, decimal = token.partition(".")
    words = _integer_words(int(whole))
    if separator:
        words.extend(["point", *(SMALL_NUMBERS[int(digit)] for digit in decimal)])
    return words


def _normalize_text(value: str) -> str:
    normalized = value.casefold()
    normalized = re.sub(r"(?<=[a-z])-(?=[a-z])", " ", normalized)
    for symbol, spoken in (
        ("=", " equals "),
        ("+", " plus "),
        ("−", " minus "),
        ("-", " minus "),
        ("/", " divided by "),
        ("×", " times "),
        ("*", " times "),
        ("÷", " divided by "),
        ("²", " squared "),
        ("√", " square root "),
    ):
        normalized = normalized.replace(symbol, spoken)
    normalized = re.sub(
        r"(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)",
        " ",
        normalized,
    )
    tokens = WORD_PATTERN.findall(normalized)
    canonical: list[str] = []
    for token in tokens:
        if token in {"equal", "equals"}:
            canonical.append("equals")
        elif token in {"negative", "minus"}:
            canonical.append("minus")
        elif token == "over":
            canonical.extend(["divided", "by"])
        elif token[0].isdigit():
            canonical.extend(_number_token_words(token))
        else:
            canonical.append(token)
    return " ".join(canonical)


def _similarity(expected: str, transcript: str) -> float:
    return SequenceMatcher(
        None,
        _normalize_text(expected),
        _normalize_text(transcript),
    ).ratio()


def synthesize_verified_phrase(
    narration: str,
    destination: Path,
    *,
    attempts: int | None = None,
) -> VoiceResult:
    if attempts is None:
        try:
            attempts = int(os.environ.get("VIDEO_TTS_ATTEMPTS", "5"))
        except ValueError:
            attempts = 5
    attempts = max(1, min(attempts, 6))
    provider = os.environ.get("VIDEO_TTS_PROVIDER", "gemini")
    qa_enabled = os.environ.get("VIDEO_VOICE_QA", "true").lower() != "false"
    maximum_duration = max(5.0, len(narration.split()) / 1.65 + 2.5)
    last_error: Exception | None = None

    for attempt in range(attempts):
        candidate = destination.with_name(
            f"{destination.stem}-attempt-{attempt + 1}.wav"
        )
        try:
            if provider == "mock":
                _mock_wave(candidate, narration)
            elif provider == "gemini":
                _gemini_tts(narration, candidate)
            else:
                raise RuntimeError(f"Unsupported VIDEO_TTS_PROVIDER: {provider}")

            normalized = destination.with_suffix(".normalized.wav")
            _run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(candidate),
                    "-ar",
                    "24000",
                    "-ac",
                    "1",
                    "-c:a",
                    "pcm_s16le",
                    str(normalized),
                ]
            )
            duration = probe_duration(normalized)
            if duration > maximum_duration:
                raise RuntimeError("voice duration guard rejected the phrase")

            if provider == "mock" or not qa_enabled:
                similarity = 1.0
            else:
                transcript = transcribe_audio(normalized.read_bytes())
                similarity = _similarity(narration, transcript)
                if similarity < 0.82:
                    raise RuntimeError("voice transcription did not match the script")

            normalized.replace(destination)
            return VoiceResult(destination, duration, similarity)
        except (
            OSError,
            RuntimeError,
            subprocess.CalledProcessError,
            TimeoutError,
            urllib.error.URLError,
        ) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(2**attempt)
                continue
    raise RuntimeError(f"Voice generation failed after retries: {last_error}")

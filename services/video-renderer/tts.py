from __future__ import annotations

import base64
import json
import logging
import math
import os
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import wave
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from gemini import GeminiError, transcribe_audio

LOGGER = logging.getLogger("video-renderer.tts")
TTS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_TTS_STYLE = (
    "Warm, precise, patient math tutor. Speak naturally at a focused "
    "teaching pace. Pronounce variables, signs and numbers crisply. "
    "Do not sound theatrical."
)
WORD_PATTERN = re.compile(r"[^\W\d_]+|\d+(?:\.\d+)?")
# A take at or above QA_PASS is accepted immediately. After several takes the
# closest one is accepted when it still clears QA_FLOOR: transcription models
# spell mathematics inconsistently, and a lesson must not fail on spelling.
QA_PASS = 0.82
QA_FLOOR = 0.6
QA_FLOOR_NON_LATIN = 0.45
TAKES_BEFORE_BEST = 3
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
    verified: bool = True


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
    style = os.environ.get("VIDEO_TTS_STYLE", DEFAULT_TTS_STYLE)
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


def _azure_tts(narration: str, destination: Path) -> None:
    # Dedicated variables prevent legacy Azure chat credentials or Gemini voice
    # settings from changing the speech deployment when switching providers.
    api_key = os.environ.get("AZURE_TTS_API_KEY", "").strip()
    endpoint = os.environ.get("AZURE_TTS_ENDPOINT", "").strip()
    if not api_key:
        raise RuntimeError("AZURE_TTS_API_KEY is not configured")
    parsed = urllib.parse.urlsplit(endpoint)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
        or not re.fullmatch(r"/openai/deployments/[^/]+/audio/speech", parsed.path)
        or not urllib.parse.parse_qs(parsed.query).get("api-version")
    ):
        raise RuntimeError(
            "AZURE_TTS_ENDPOINT must be a complete HTTPS deployment speech URL "
            "with api-version"
        )
    payload = {
        # Azure requires the deployment in the body as well as the URL.
        "model": urllib.parse.unquote(parsed.path.split("/")[3]),
        "input": narration,
        "voice": os.environ.get("AZURE_TTS_VOICE", "coral"),
        "instructions": os.environ.get("VIDEO_TTS_STYLE", DEFAULT_TTS_STYLE),
        # Both providers feed the same 24 kHz mono PCM verification/render path.
        "response_format": "pcm",
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "api-key": api_key},
    )
    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            audio = response.read()
            content_type = response.headers.get_content_type()
    except urllib.error.HTTPError as error:
        # Never include provider response bodies, credentials, or narration.
        error.close()
        raise RuntimeError(f"Azure TTS failed ({error.code})") from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError("Azure TTS request failed") from None
    if (
        not audio
        or len(audio) % 2
        or not (
            content_type.startswith("audio/")
            or content_type == "application/octet-stream"
        )
    ):
        raise RuntimeError("Azure TTS returned invalid PCM audio")
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
    # Transcribers sometimes draw pauses as dash or underscore rules.
    normalized = re.sub(r"[-‐-―_.]{2,}", " ", normalized)
    normalized = re.sub(r"(?<=[^\W\d_])-(?=[^\W\d_])", " ", normalized)
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
        r"(?<=\d)(?=[^\W\d_])|(?<=[^\W\d_])(?=\d)",
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
        elif token[0] in "0123456789":
            try:
                canonical.extend(_number_token_words(token))
            except ValueError:
                canonical.append(token)
        else:
            canonical.append(token)
    return " ".join(canonical)


def _similarity(expected: str, transcript: str) -> float:
    return SequenceMatcher(
        None,
        _normalize_text(expected),
        _normalize_text(transcript),
    ).ratio()


def _provider_is_configured(provider: str) -> bool:
    if provider == "azure":
        return bool(
            os.environ.get("AZURE_TTS_API_KEY", "").strip()
            and os.environ.get("AZURE_TTS_ENDPOINT", "").strip()
        )
    if provider == "gemini":
        return bool(os.environ.get("GOOGLE_CLOUD_API_KEY", "").strip())
    return provider == "mock"


def _provider_order(primary: str) -> list[str]:
    """The selected voice first, then the other configured voice as backup."""
    order = [primary]
    if primary == "mock":
        return order
    if os.environ.get("VIDEO_TTS_FALLBACK", "auto").strip().lower() == "none":
        return order
    backup = "gemini" if primary == "azure" else "azure"
    if _provider_is_configured(backup):
        order.append(backup)
    return order


def _speak(provider: str, narration: str, destination: Path) -> None:
    if provider == "mock":
        _mock_wave(destination, narration)
    elif provider == "gemini":
        _gemini_tts(narration, destination)
    else:
        _azure_tts(narration, destination)


def _transcript_similarity(narration: str, audio: bytes) -> float | None:
    """Return None when the checker itself is unavailable.

    A failed check says nothing about the audio, so it must not be counted as
    a failed narration take.
    """
    for attempt in range(2):
        try:
            transcript = transcribe_audio(audio)
        except (GeminiError, OSError, ValueError, RuntimeError):
            if attempt == 0:
                time.sleep(1)
            continue
        if transcript.strip():
            return _similarity(narration, transcript)
    return None


def _uses_non_latin_script(value: str) -> bool:
    letters = [character for character in value if character.isalpha()]
    foreign = sum(1 for character in letters if ord(character) > 0x024F)
    return bool(letters) and foreign / len(letters) > 0.3


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
    provider = os.environ.get("VIDEO_TTS_PROVIDER", "gemini").strip().lower()
    if provider not in {"azure", "gemini", "mock"}:
        raise RuntimeError("VIDEO_TTS_PROVIDER must be azure, gemini, or mock")
    qa_enabled = os.environ.get("VIDEO_VOICE_QA", "true").lower() != "false"
    maximum_duration = max(5.0, len(narration.split()) / 1.65 + 2.5)
    non_latin = _uses_non_latin_script(narration)
    passing = QA_FLOOR if non_latin else QA_PASS
    floor = QA_FLOOR_NON_LATIN if non_latin else QA_FLOOR
    last_error: Exception | None = None
    best: tuple[float, Path, float] | None = None
    unverified: tuple[Path, float] | None = None
    take = 0

    def accept(
        source: Path,
        duration: float,
        similarity: float,
        verified: bool,
    ) -> VoiceResult:
        source.replace(destination)
        return VoiceResult(destination, duration, similarity, verified)

    for provider_index, active in enumerate(_provider_order(provider)):
        # The backup voice gets a shorter budget; it only has to rescue a take.
        budget = attempts if provider_index == 0 else min(attempts, 3)
        evaluated = 0
        for attempt in range(budget):
            take += 1
            candidate = destination.with_name(
                f"{destination.stem}-attempt-{take}.wav"
            )
            normalized = destination.with_name(
                f"{destination.stem}-take-{take}.normalized.wav"
            )
            try:
                _speak(active, narration, candidate)
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
            except (
                OSError,
                RuntimeError,
                subprocess.CalledProcessError,
                TimeoutError,
                urllib.error.URLError,
            ) as error:
                last_error = error
                if attempt + 1 < budget:
                    time.sleep(min(2**attempt, 8))
                continue

            if active == "mock" or not qa_enabled:
                return accept(normalized, duration, 1.0, True)
            similarity = _transcript_similarity(
                narration,
                normalized.read_bytes(),
            )
            if similarity is None:
                # Valid audio, unavailable checker: regenerating cannot help.
                unverified = unverified or (normalized, duration)
                last_error = RuntimeError("voice transcription was unavailable")
                break
            if similarity >= passing:
                return accept(normalized, duration, similarity, True)
            evaluated += 1
            if best is None or similarity > best[0]:
                best = (similarity, normalized, duration)
            last_error = RuntimeError(
                "voice transcription did not match the script"
            )
            if evaluated >= TAKES_BEFORE_BEST and best[0] >= floor:
                break
            if attempt + 1 < budget:
                time.sleep(min(2**attempt, 4))

        if best is not None and best[0] >= floor:
            LOGGER.warning(
                "Accepted the closest narration take similarity=%.2f provider=%s",
                best[0],
                active,
            )
            return accept(best[1], best[2], best[0], True)
        if unverified is not None:
            LOGGER.warning(
                "Accepted narration without transcription check provider=%s",
                active,
            )
            return accept(unverified[0], unverified[1], 0.0, False)

    raise RuntimeError(f"Voice generation failed after retries: {last_error}")

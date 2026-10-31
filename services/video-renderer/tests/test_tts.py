from __future__ import annotations

import io
import json
import os
import tempfile
import unittest
import urllib.error
import wave
from email.message import Message
from pathlib import Path
from unittest.mock import MagicMock, patch

from gemini import GeminiError
from tts import _azure_tts, _mock_wave, _similarity, synthesize_verified_phrase

ENDPOINT = (
    "https://example.openai.azure.com/openai/deployments/gpt-4o-mini-tts"
    "/audio/speech?api-version=2025-03-01-preview"
)
SCRIPT = "Subtract five from both sides, then divide by three."
AZURE_ENV = {
    "PATH": os.environ.get("PATH", os.defpath),
    "VIDEO_TTS_PROVIDER": "azure",
    "AZURE_TTS_ENDPOINT": ENDPOINT,
    "AZURE_TTS_API_KEY": "test-azure-key",
    "VIDEO_VOICE_QA": "true",
}


def audio_response(audio: bytes, content_type: str = "audio/pcm") -> MagicMock:
    response = MagicMock()
    response.__enter__.return_value = response
    response.read.return_value = audio
    response.headers = Message()
    response.headers["Content-Type"] = content_type
    return response


class AzureVoiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.destination = Path(self.work.name) / "voice.wav"

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_azure_pcm_passes_real_normalization_and_transcription_gate(self) -> None:
        _mock_wave(self.destination, SCRIPT)
        with wave.open(str(self.destination)) as source:
            pcm = source.readframes(source.getnframes())
        self.destination.unlink()
        with (
            patch(
                "tts.urllib.request.urlopen", return_value=audio_response(pcm)
            ) as send,
            patch("tts.transcribe_audio", return_value=SCRIPT) as transcribe,
        ):
            result = synthesize_verified_phrase(SCRIPT, self.destination, attempts=1)
        request = send.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(request.full_url, ENDPOINT)
        self.assertEqual(request.get_header("Api-key"), "test-azure-key")
        self.assertNotIn("test-azure-key", request.full_url)
        self.assertEqual(payload["input"], SCRIPT)
        self.assertEqual(payload["model"], "gpt-4o-mini-tts")
        self.assertEqual(payload["voice"], "coral")
        self.assertEqual(payload["response_format"], "pcm")
        self.assertNotIn("<script>", payload["input"])
        self.assertGreater(result.duration_seconds, 0)
        self.assertEqual(result.transcript_similarity, 1.0)
        self.assertTrue(transcribe.call_args.args[0].startswith(b"RIFF"))
        with wave.open(str(result.path)) as output:
            self.assertEqual(
                (output.getframerate(), output.getnchannels(), output.getsampwidth()),
                (24000, 1, 2),
            )

    @patch.dict(
        os.environ,
        {
            **AZURE_ENV,
            "VIDEO_TTS_VOICE": "Sulafat",
            "VIDEO_TTS_MODEL": "gemini-test",
            "AZURE_TTS_VOICE": "nova",
            "VIDEO_TTS_STYLE": "Patient, clear tutor.",
        },
        clear=True,
    )
    def test_azure_has_independent_voice_and_shared_style(self) -> None:
        with patch(
            "tts.urllib.request.urlopen", return_value=audio_response(b"\0\0")
        ) as send:
            _azure_tts(SCRIPT, self.destination)
        payload = json.loads(send.call_args.args[0].data)
        self.assertEqual(payload["voice"], "nova")
        self.assertEqual(payload["instructions"], "Patient, clear tutor.")
        self.assertNotIn("gemini-test", json.dumps(payload))

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_mismatched_audio_is_retried_then_rejected_without_gemini_fallback(
        self,
    ) -> None:
        with (
            patch(
                "tts._azure_tts", side_effect=lambda text, path: _mock_wave(path, text)
            ) as azure,
            patch("tts._gemini_tts") as gemini,
            patch("tts.transcribe_audio", return_value="Completely unrelated words"),
            patch("tts.time.sleep"),
            self.assertRaisesRegex(RuntimeError, "transcription did not match"),
        ):
            synthesize_verified_phrase(SCRIPT, self.destination, attempts=2)
        self.assertEqual(azure.call_count, 2)
        gemini.assert_not_called()
        self.assertFalse(self.destination.exists())

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_unavailable_checker_does_not_fail_valid_audio(self) -> None:
        with (
            patch(
                "tts._azure_tts", side_effect=lambda text, path: _mock_wave(path, text)
            ) as azure,
            patch("tts.transcribe_audio", side_effect=GeminiError("down")),
            patch("tts.time.sleep"),
        ):
            result = synthesize_verified_phrase(SCRIPT, self.destination, attempts=5)
        azure.assert_called_once()
        self.assertFalse(result.verified)
        self.assertTrue(self.destination.exists())
        self.assertGreater(result.duration_seconds, 0)

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_closest_take_is_kept_when_spelling_differs(self) -> None:
        transcripts = iter(
            [
                "Subtract five from both sides then split by tree",
                "Subtract five from both sides, then divide it by tree.",
                "Subtract five from sides then divide",
            ]
        )
        with (
            patch(
                "tts._azure_tts", side_effect=lambda text, path: _mock_wave(path, text)
            ) as azure,
            patch("tts.transcribe_audio", side_effect=lambda audio: next(transcripts)),
            patch("tts.time.sleep"),
            patch("tts.QA_PASS", 0.99),
        ):
            result = synthesize_verified_phrase(SCRIPT, self.destination, attempts=5)
        self.assertEqual(azure.call_count, 3)
        self.assertTrue(result.verified)
        self.assertGreater(result.transcript_similarity, 0.85)
        self.assertTrue(self.destination.exists())

    @patch.dict(
        os.environ, {**AZURE_ENV, "GOOGLE_CLOUD_API_KEY": "test-gemini-key"}, clear=True
    )
    def test_backup_voice_rescues_a_failed_primary_voice(self) -> None:
        with (
            patch(
                "tts._azure_tts", side_effect=RuntimeError("Azure TTS failed (400)")
            ) as azure,
            patch(
                "tts._gemini_tts", side_effect=lambda text, path: _mock_wave(path, text)
            ) as gemini,
            patch("tts.transcribe_audio", return_value=SCRIPT),
            patch("tts.time.sleep"),
        ):
            result = synthesize_verified_phrase(SCRIPT, self.destination, attempts=2)
        self.assertEqual(azure.call_count, 2)
        gemini.assert_called_once()
        self.assertEqual(result.transcript_similarity, 1.0)

    @patch.dict(
        os.environ,
        {
            **AZURE_ENV,
            "GOOGLE_CLOUD_API_KEY": "test-gemini-key",
            "VIDEO_TTS_FALLBACK": "none",
        },
        clear=True,
    )
    def test_backup_voice_can_be_disabled(self) -> None:
        with (
            patch("tts._azure_tts", side_effect=RuntimeError("Azure TTS failed (500)")),
            patch("tts._gemini_tts") as gemini,
            patch("tts.time.sleep"),
            self.assertRaisesRegex(RuntimeError, "Voice generation failed"),
        ):
            synthesize_verified_phrase(SCRIPT, self.destination, attempts=2)
        gemini.assert_not_called()

    def test_transcriber_pause_rules_and_other_scripts_compare_fairly(self) -> None:
        self.assertEqual(
            _similarity(
                "Isolate the trig term first, then collect every angle.",
                "Isolate the trig ------------ term first, then collect every angle.",
            ),
            1.0,
        )
        self.assertGreater(
            _similarity(
                "Производная от икс в кубе равна трем икс в квадрате",
                "Производная от икс в кубе равна трём икс в квадрате",
            ),
            0.9,
        )
        self.assertLess(
            _similarity("Производная равна нулю", "Совсем другой текст здесь"),
            0.6,
        )

    @patch.dict(os.environ, {**AZURE_ENV, "VIDEO_TTS_PROVIDER": "gemini"}, clear=True)
    def test_switching_back_uses_gemini_with_azure_configuration_present(self) -> None:
        with (
            patch(
                "tts._gemini_tts", side_effect=lambda text, path: _mock_wave(path, text)
            ) as gemini,
            patch("tts._azure_tts") as azure,
            patch("tts.transcribe_audio", return_value=SCRIPT),
        ):
            synthesize_verified_phrase(SCRIPT, self.destination, attempts=1)
        gemini.assert_called_once()
        azure.assert_not_called()

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_empty_or_non_audio_responses_are_rejected(self) -> None:
        for data, content_type in [
            (b"", "audio/pcm"),
            (b"x", "audio/pcm"),
            (b"{}", "application/json"),
        ]:
            with (
                self.subTest(content_type=content_type, size=len(data)),
                patch(
                    "tts.urllib.request.urlopen",
                    return_value=audio_response(data, content_type),
                ),
                self.assertRaisesRegex(RuntimeError, "invalid PCM"),
            ):
                _azure_tts(SCRIPT, self.destination)

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_http_error_contains_only_status(self) -> None:
        failure = urllib.error.HTTPError(
            ENDPOINT, 401, "private detail", {}, io.BytesIO(b"test-azure-key")
        )
        with (
            patch("tts.urllib.request.urlopen", side_effect=failure),
            self.assertRaises(RuntimeError) as raised,
        ):
            _azure_tts(SCRIPT, self.destination)
        self.assertEqual(str(raised.exception), "Azure TTS failed (401)")
        self.assertIsNone(raised.exception.__cause__)

    @patch.dict(os.environ, AZURE_ENV, clear=True)
    def test_bad_endpoint_or_missing_key_never_sends_request(self) -> None:
        for endpoint in [
            "",
            "http://example.com/audio/speech",
            "https://example.com",
            ENDPOINT.split("?")[0],
        ]:
            with (
                self.subTest(endpoint=endpoint),
                patch.dict(os.environ, {"AZURE_TTS_ENDPOINT": endpoint}),
                patch("tts.urllib.request.urlopen") as send,
            ):
                with self.assertRaisesRegex(RuntimeError, "AZURE_TTS_ENDPOINT"):
                    _azure_tts(SCRIPT, self.destination)
                send.assert_not_called()
        with (
            patch.dict(os.environ, {"AZURE_TTS_API_KEY": ""}),
            patch("tts.urllib.request.urlopen") as send,
        ):
            with self.assertRaisesRegex(RuntimeError, "AZURE_TTS_API_KEY"):
                _azure_tts(SCRIPT, self.destination)
            send.assert_not_called()


if __name__ == "__main__":
    unittest.main()

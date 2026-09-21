"""Real Manim/FFmpeg regressions for reuse of a production renderer process."""
from __future__ import annotations

import concurrent.futures
import json
import tempfile
import unittest
import wave
from pathlib import Path

from manim import Create, Dot, Scene, config, tempconfig

from render_engine import _render_scene_movie, _run


SMALL_RENDER = {
    "pixel_width": 320,
    "pixel_height": 180,
    "frame_rate": 10,
    "disable_caching": True,
    "verbosity": "ERROR",
    "progress_bar": "none",
    # A caller-supplied output path must never become a job's output path.
    "output_file": "caller-output.mp4",
}


def voiced_scene(root: Path) -> type[Scene]:
    audio = root / "voice.wav"
    with wave.open(str(audio), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(b"\0\0" * 6_000)

    class SampleScene(Scene):
        def construct(self) -> None:
            self.add_sound(str(audio))
            self.play(Create(Dot()), run_time=0.3)
            self.wait(0.2)

    return SampleScene


class RenderStateTests(unittest.TestCase):
    def assert_playable(self, movie: Path) -> None:
        streams = json.loads(_run([
            "ffprobe", "-v", "error", "-show_entries", "stream=codec_type",
            "-of", "json", str(movie),
        ]).stdout)["streams"]
        self.assertEqual({stream["codec_type"] for stream in streams}, {"audio", "video"})
        # Decode the complete asset; file existence alone cannot catch bad muxing.
        _run(["ffmpeg", "-v", "error", "-xerror", "-i", str(movie), "-f", "null", "-"])

    def test_each_scene_keeps_its_own_movie_and_restores_config(self) -> None:
        with tempconfig(SMALL_RENDER), tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            scene = voiced_scene(root)
            before = (config.media_dir, config.output_file)
            first = _render_scene_movie(scene, root / "first")
            first_bytes = first.read_bytes()
            second = _render_scene_movie(scene, root / "second")
            self.assertNotEqual(first, second)
            self.assertTrue(first.resolve().is_relative_to((root / "first").resolve()))
            self.assertTrue(second.resolve().is_relative_to((root / "second").resolve()))
            self.assertEqual(first.read_bytes(), first_bytes)
            self.assertEqual((config.media_dir, config.output_file), before)
            self.assert_playable(first)
            self.assert_playable(second)

    def test_warm_worker_renders_after_previous_job_directory_is_deleted(self) -> None:
        with tempconfig(SMALL_RENDER):
            def render_job() -> Path:
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    movie = _render_scene_movie(voiced_scene(root), root / "media")
                    self.assertTrue(movie.resolve().is_relative_to(root.resolve()))
                    self.assert_playable(movie)
                    return root

            # FastAPI dispatches renders on threads in a long-lived process.
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as worker:
                for _ in range(4):
                    old_root = worker.submit(render_job).result()
                    self.assertFalse(old_root.exists())
            self.assertEqual(config.output_file, "caller-output.mp4")

    def test_failed_render_restores_config_and_retry_uses_current_directory(self) -> None:
        attempts = []

        class InterruptedScene:
            def render(self) -> None:
                attempts.append((config.media_dir, config.output_file))
                config.output_file = "/deleted/previous-job/movie.mp4"
                raise FileNotFoundError(2, "missing movie")

        with tempconfig(SMALL_RENDER), tempfile.TemporaryDirectory() as directory:
            before = (config.media_dir, config.output_file)
            with self.assertRaises(FileNotFoundError):
                _render_scene_movie(InterruptedScene, Path(directory))
            self.assertEqual((config.media_dir, config.output_file), before)
        self.assertEqual(len(attempts), 2)
        self.assertTrue(all(output == "" for _, output in attempts))
        self.assertNotEqual(attempts[0][0], attempts[1][0])


if __name__ == "__main__":
    unittest.main()

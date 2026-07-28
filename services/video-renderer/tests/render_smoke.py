from __future__ import annotations

import json
import os
from pathlib import Path

from models import LessonPlan
from render_engine import render_lesson_clips
from tts import synthesize_verified_phrase


TESTS_DIR = Path(__file__).resolve().parent
FIXTURE = TESTS_DIR.parent / "lesson-example.json"


def main() -> None:
    os.environ["VIDEO_TTS_PROVIDER"] = "mock"
    os.environ["VIDEO_VOICE_QA"] = "false"

    output_dir = Path(
        os.environ.get("VIDEO_SMOKE_OUTPUT", "/tmp/mathsolver-video-smoke")
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    audio_dir = output_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    plan = LessonPlan.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    audio_by_clip = []
    for clip_index, clip in enumerate(plan.clips, start=1):
        clip_audio = []
        for segment_index, segment in enumerate(clip.segments, start=1):
            clip_audio.append(
                synthesize_verified_phrase(
                    segment.narration,
                    audio_dir
                    / f"{clip_index:02d}-{segment_index:02d}.wav",
                )
            )
        audio_by_clip.append(clip_audio)

    clips = render_lesson_clips(plan, audio_by_clip, output_dir)
    if len(clips) != 1 or clips[0].id != "full-lesson":
        raise RuntimeError("renderer did not assemble one full lesson video")

    for clip in clips:
        for path in (
            clip.video_path,
            clip.captions_path,
            clip.poster_path,
        ):
            if not path.exists() or path.stat().st_size == 0:
                raise RuntimeError(f"renderer produced an empty asset: {path}")
        if clip.duration_seconds <= 0:
            raise RuntimeError(f"renderer produced an invalid duration: {clip.id}")

    print(
        json.dumps(
            {
                "output": str(output_dir),
                "clips": [
                    {
                        "id": clip.id,
                        "durationSeconds": clip.duration_seconds,
                        "video": str(clip.video_path),
                        "captions": str(clip.captions_path),
                        "poster": str(clip.poster_path),
                    }
                    for clip in clips
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

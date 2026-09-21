"""Generate a local, verified narration sample or full fixture lesson.

Load ignored env files into the process first. This never creates a user job,
uploads media, or changes the live renderer. The render option requires the
same Manim/LaTeX runtime as the renderer Docker image.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from tts import synthesize_verified_phrase


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    if not args.render:
        result = synthesize_verified_phrase(
            "Three x plus five equals twenty. Subtract five from both sides, "
            "then divide by three. So x equals five.",
            args.output / "voice.wav",
        )
        print(
            json.dumps(
                {
                    "audio": str(result.path),
                    "durationSeconds": round(result.duration_seconds, 2),
                    "transcriptSimilarity": round(result.transcript_similarity, 3),
                }
            )
        )
        return

    from models import LessonPlan
    from render_engine import render_lesson_clips

    fixture = Path(__file__).resolve().parent.parent / "lesson-example.json"
    plan = LessonPlan.model_validate_json(fixture.read_text(encoding="utf-8"))
    audio_dir = args.output / "audio"
    audio_dir.mkdir(exist_ok=True)
    audio_by_clip = []
    for clip_index, clip in enumerate(plan.clips, start=1):
        voices = []
        for segment_index, segment in enumerate(clip.segments, start=1):
            voices.append(
                synthesize_verified_phrase(
                    segment.narration,
                    audio_dir / f"{clip_index:02d}-{segment_index:02d}.wav",
                )
            )
            print(f"Verified narration {clip_index}.{segment_index}", flush=True)
        audio_by_clip.append(voices)
    clips = render_lesson_clips(plan, audio_by_clip, args.output)
    print(
        json.dumps(
            {
                "clips": [
                    {
                        "video": str(clip.video_path),
                        "captions": str(clip.captions_path),
                        "durationSeconds": round(clip.duration_seconds, 2),
                        "transcriptSimilarity": round(clip.transcript_similarity, 3),
                    }
                    for clip in clips
                ]
            }
        )
    )


if __name__ == "__main__":
    main()

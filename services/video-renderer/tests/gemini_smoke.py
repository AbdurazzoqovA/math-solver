from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from planner import create_lesson_plan, review_lesson_plan
from render_engine import render_lesson_clips
from tts import synthesize_verified_phrase


PROBLEM = "Solve the system: x + y = 7 and 2x - y = 5."
SOLUTION = """
**Step 1:** Add the equations to eliminate y:
(x + y) + (2x - y) = 7 + 5, so 3x = 12 and x = 4.

**Step 2:** Substitute x = 4 into x + y = 7:
4 + y = 7, so y = 3.

**Step 3:** Check: 4 + 3 = 7 and 2(4) - 3 = 5.
Therefore x = 4 and y = 3.
""".strip()


def main() -> None:
    plan = create_lesson_plan(PROBLEM, SOLUTION)
    if not plan.supported:
        raise RuntimeError("Gemini marked the supported smoke problem unsupported")
    review = review_lesson_plan(PROBLEM, SOLUTION, plan)
    if not review.valid:
        raise RuntimeError("Gemini reviewer rejected the generated smoke plan")

    with tempfile.TemporaryDirectory(prefix="mathsolver-gemini-smoke-") as work:
        voice = synthesize_verified_phrase(
            "Adding the equations cancels y, leaving three x equals twelve.",
            Path(work) / "voice.wav",
            attempts=2,
        )
        if voice.duration_seconds <= 0 or voice.transcript_similarity < 0.82:
            raise RuntimeError("Gemini voice smoke verification failed")

        os.environ["VIDEO_TTS_PROVIDER"] = "mock"
        os.environ["VIDEO_VOICE_QA"] = "false"
        render_root = Path(work) / "generated-render"
        (render_root / "audio").mkdir(parents=True, exist_ok=True)
        audio_by_clip = []
        for clip_index, clip in enumerate(plan.clips, start=1):
            clip_audio = []
            for segment_index, segment in enumerate(clip.segments, start=1):
                clip_audio.append(
                    synthesize_verified_phrase(
                        segment.narration,
                        render_root
                        / "audio"
                        / f"{clip_index:02d}-{segment_index:02d}.wav",
                    )
                )
            audio_by_clip.append(clip_audio)
        rendered = render_lesson_clips(plan, audio_by_clip, render_root)
        if len(rendered) != 1 or rendered[0].id != "full-lesson":
            raise RuntimeError(
                "Generated Gemini plan did not assemble one full lesson"
            )

        print(
            json.dumps(
                {
                    "supported": plan.supported,
                    "reviewValid": review.valid,
                    "clipCount": len(plan.clips),
                    "visualKinds": sorted(
                        {
                            segment.visual.kind
                            for clip in plan.clips
                            for segment in clip.segments
                        }
                    ),
                    "voiceDurationSeconds": round(voice.duration_seconds, 2),
                    "voiceSimilarity": round(voice.transcript_similarity, 3),
                    "renderedClipCount": len(rendered),
                }
            )
        )


if __name__ == "__main__":
    main()

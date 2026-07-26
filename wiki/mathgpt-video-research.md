# MathGPT Video Explanation Research

Reverse-engineering notes for MathGPT's generated explanation videos, captured 2026-07-26. This is competitor research, not a claim about MathGPT's private backend. Context: [[growth-strategy]], [[product-overview]], [[tech-and-ops]].

## What is verified

MathGPT is not waiting for a conventional text-to-video model to invent a movie. Its public web client exposes a programmatic artifact pipeline:

- A video request sends the current conversation to `POST /api/v3/video` with `x-video-rendering-type: livestream`.
- The endpoint returns a `passthrough_id` immediately. The chat records an LLM-style `create_artifact` tool call with artifact type `video_explanation`.
- The client watches `GET /api/v3/video/status?passthrough_id=...` with server-sent events.
- IDs prefixed with `hls_` play through HLS.js from `/api/streams/{id}/master.m3u8`. The player shows a red **Live** marker while the playlist has no `#EXT-X-ENDLIST`, so a student can start watching before the complete video has rendered.
- Completed/public samples use Mux playback IDs, Mux Player, and `image.mux.com` thumbnails. The client also exposes share, feedback, and MP4-download endpoints.
- The public sample inspected was 91.7 seconds, H.264 at 24 fps, with only 854×480 and 480×270 renditions, AAC audio, and a WebVTT English caption track. Low resolution and frame rate keep rendering and delivery cheap.
- The public client handles `401` as sign-in required, `402` as upgrade required, and `429` with “maximum number of videos you can create today.” This confirms a server-side daily quota, but the exact free count is not present in the client bundle.
- The Unlimited benefit card says “Unlimited videos” and promises animated videos with voiceovers and downloads. The current web pricing bundle defaults to a $14.99 monthly variant and advertises an annual discount, but promotions and server-side entitlements can change.

## Most likely private pipeline

The exact renderer and models are not public. The visual style—black canvas, LaTeX/Computer Modern equations, number lines, arrows, boxes, and object transforms—strongly resembles Manim or a custom Manim-like renderer. A safer and more scalable design than asking an LLM to invent arbitrary animation code is:

1. An LLM turns the verified solution into narration plus a typed scene plan.
2. A deterministic template renderer maps scene primitives such as equations, highlights, axes, arrows, graphs, and transformations to animations.
3. TTS generates narration, preferably one audio clip per scene.
4. Scene duration is derived from audio duration; captions come directly from the narration.
5. FFmpeg renders/concatenates H.264/AAC segments.
6. HLS segments are published as each scene completes; the final asset is stored or handed to a video platform such as Mux.

This is a hybrid: the LLM decides **what to teach and show**, while ordinary rendering code decides **what every pixel and frame looks like**. It is much faster, cheaper, and more consistent than diffusion-style generative video.

## Why five free videos can be economical

Illustrative cost for a 60–90 second, 480p/24 fps explanation:

| Part | Approximate cost |
|---|---:|
| LLM storyboard/narration | $0.002–$0.04 |
| TTS narration | $0.005–$0.04 |
| CPU render and FFmpeg | $0.003–$0.02 |
| Storage/initial delivery | usually under $0.01 |
| **Likely total** | **about $0.02–$0.10/video** |

The range depends on model/provider, output length, retries, cache hits, and viewing volume. Current public pricing supports the order of magnitude:

- Google Cloud TTS lists $4 per million characters for Standard, $16 for WaveNet/Neural2, and $30 for Chirp 3 HD, with free character allowances.
- Cloud Run CPU is measured in vCPU-seconds and includes a monthly free tier. A short CPU render costs fractions of a cent to a few cents.
- Mux basic on-demand input is free, storage starts at $0.0024 per video minute/month, and the first 100,000 delivery minutes/month are free.
- Cloud Tasks includes the first million operations/month for free.

At this range, five trial videos cost roughly $0.10–$0.50 per user—reasonable acquisition spend for a product selling an Unlimited subscription. Quotas, short 480p videos, caching, retention/deletion rules, and server-side abuse protection matter more than raw video bandwidth.

## Existing MathSolver foundation

MathSolver already has the identity and database pieces needed to gate a video quota:

- Firebase Authentication supports Google and verified Email/Password accounts through `math-solver-e3a55`.
- Cloud Firestore is live in `nam5`, with verified-account owner isolation already tested for the private notebook.
- A video feature can reuse the Firebase UID for entitlements and keep quota/job metadata in Firestore.

The current Next.js API routes do not yet verify Firebase ID tokens server-side, and the repository does not include the Firebase Admin SDK. A secure video endpoint should verify the caller's token and `email_verified` claim, then reserve quota atomically in a Firestore transaction. Because Cloud Run and Firebase are separate projects, the Cloud Run service account needs only the required cross-project Firestore permissions; it should not rely on a checked-in service-account key.

The genuinely new infrastructure is the asynchronous render queue, renderer worker, and private video storage/delivery layer. Firebase Storage is not currently used by the product.

## Recommended MathSolver design

Use a deterministic scene system, not arbitrary LLM-generated Python or JavaScript:

```text
existing verified solve
  -> storyboard JSON (narration + typed scenes)
  -> schema/LaTeX/accuracy validation
  -> per-scene TTS and render jobs
  -> FFmpeg concatenate + captions
  -> Cloud Storage/Mux
  -> streamed progress and final player
```

For visual math quality, a small Manim render worker is the best fit. For maximum stack reuse, Remotion can create MP4s from React, but MathSolver would need to build more equation/graph primitives itself. A good typed scene schema should support only known primitives such as `title`, `equation`, `transformEquation`, `highlight`, `numberLine`, `coordinatePlane`, `plot`, `arrow`, and `caption`.

An MVP should:

- support one-variable algebra first, using 45–75 second videos and a small template set;
- reuse the already-generated solution rather than solve the problem again;
- verify equations with SymPy or the existing graph-analysis primitives before rendering;
- render independent scenes in parallel, then concatenate;
- generate captions from the narration and disclose that the voice is AI-generated;
- use Cloud Tasks plus a separate Cloud Run render service/job with Python, Manim, LaTeX, and FFmpeg;
- store job/quota state in the existing Firestore database using server-only transactions and keep private videos private by default;
- cap free usage by authenticated user plus IP/device abuse signals.

This is an extension of MathSolver's existing Firebase account and Firestore foundation—not a new account/database build. The primary engineering work is the deterministic renderer and asynchronous video pipeline, plus server-side token verification, quota enforcement, and video storage/delivery.

## Risks

- LLM-generated arbitrary code is a remote-code-execution risk; use schema-constrained scene data and fixed templates.
- A fluent voice can make an incorrect solution feel more trustworthy; verify the math before starting an expensive render.
- LaTeX and layout failures need preflight rendering and retry limits.
- Public galleries can leak homework or personal data; sharing must be explicit.
- Video generation should have idempotency keys, timeouts, cancellation, retention/deletion rules, and per-user cost ceilings.

## Public references

- MathGPT video creator: https://math-gpt.org/tools/video
- Manim documentation: https://docs.manim.community/en/stable/
- Remotion: https://www.remotion.dev/
- Mux pricing: https://www.mux.com/docs/pricing/overview
- Google Cloud TTS pricing: https://cloud.google.com/text-to-speech/pricing
- Cloud Run pricing: https://cloud.google.com/run/pricing
- Cloud Tasks pricing: https://cloud.google.com/tasks/pricing
- OpenAI TTS guide: https://developers.openai.com/api/docs/guides/text-to-speech

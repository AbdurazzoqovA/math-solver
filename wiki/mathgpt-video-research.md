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
- The current creator surface names the history destination **Video Gallery** and also promotes community videos. MathSolver uses **Video Library** instead: the first release is an authenticated, account-owned history with no public/community exposure, so “Gallery” would suggest sharing that the product does not yet provide.

## Most likely private pipeline

The exact renderer and models are not public. The visual style—black canvas, LaTeX/Computer Modern equations, number lines, arrows, boxes, and object transforms—strongly resembles Manim or a custom Manim-like renderer. A safer and more scalable design than asking an LLM to invent arbitrary animation code is:

1. An LLM turns the verified solution into narration plus a typed scene plan.
2. A deterministic template renderer maps scene primitives such as equations, highlights, axes, arrows, graphs, and transformations to animations.
3. TTS generates narration, preferably one audio clip per scene.
4. Scene duration is derived from audio duration; captions come directly from the narration.
5. FFmpeg renders/concatenates H.264/AAC segments.
6. HLS segments are published as each scene completes; the final asset is stored or handed to a video platform such as Mux.

This is a hybrid: the LLM decides **what to teach and show**, while ordinary rendering code decides **what every pixel and frame looks like**. It is much faster, cheaper, and more consistent than diffusion-style generative video.

## Why 10 free videos per day can be economical

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

At this range, a learner who uses all 10 daily videos costs roughly $0.20–$1.00 for that day. This is financeable during early product validation but makes monitoring, caching, retention/deletion rules, and server-side abuse protection important before traffic scales.

## MathSolver production integration

The web integration implemented on 2026-07-28 reuses the existing identity and database foundation:

- Firebase Authentication supports Google and verified Email/Password accounts through `math-solver-e3a55`.
- Cloud Firestore is live in `nam5`, with verified-account owner isolation already tested for the private notebook.
- The Firebase UID owns server-only entitlement and video-job records in Firestore.
- The Next.js API verifies a fresh ID token with revocation checking and requires `email_verified`.
- A transaction creates a deterministic job and reserves one of 10 free lessons in the current UTC-day bucket; duplicate requests are idempotent, and failed/unsupported renders refund only the matching daily bucket.
- Cloud Tasks invokes a private, separately scaled Cloud Run renderer with OIDC.
- The worker asks Gemini for a schema-constrained pedagogy plan, runs a separate mathematical review, creates short Gemini TTS phrases, rejects narration below the transcription-similarity gate, and feeds only validated typed data to hand-written Manim primitives.
- Private GCS stores independent H.264/AAC clips, WebVTT captions, JPEG posters, and one manifest for 14 days. The authorized API validates every object prefix and returns 45-minute signed playback URLs.
- The React modal provides continuous chapter playback by default, a caption-safe transcript strip, replay controls, optional Practice pauses with concept feedback/near-transfer, deletion, and AI-voice disclosure. Analytics contain only low-cardinality outcomes, never math or job identity.

The implementation uses Application Default Credentials and narrow cross-project IAM instead of a checked-in service-account key. Firebase Storage remains unused; the video bucket belongs to the Cloud Run project.

## Pedagogical correction: a video is not automatically an explanation

The standalone 2026-07-27 prototype established technical feasibility—Gemini-generated narration, parallel per-scene TTS/rendering, captions, and a sub-16-second render—but it also exposed the more important product risk. Its visuals are triggered by fixed percentages of scene duration and mainly restate symbolic steps. It is a clean narrated worked example, not yet a strong conceptual explanation.

The same failure mode remained possible in the first integrated production contract: the planner received the numbered answer and emitted chapters containing short narration plus one finished visual, while the renderer mostly wrote or swapped complete equation cards. Prompt wording alone could not overcome a schema that had no representation for teaching role, misconception, comparison, or attention target.

The 2026-07-28 schema-v2 correction makes the written answer an accuracy reference rather than a storyboard. Supported plans now require five to six chapters covering orientation, concept, strategy, misconception, and verification/generalization; segment purposes must cover noticing, explaining why, demonstrating, connecting, contrasting, verifying, and generalizing. A deterministic Pydantic gate also requires a meaningful non-equation representation, limits equation-only scenes, and requires construct, highlight, and visible side-by-side comparison actions. Equation scenes can identify the literal subexpression under discussion and contrast two labeled alternatives; the Manim renderer constructs, transforms, signals, and compares those objects instead of presenting every expression in the same card template. The independent reviewer rejects a lesson that loses nothing when replaced by a numbered step list.

This matches [Khan Academy's published video design guidance](https://blog.khanacademy.org/how-khan-academy-videos-are-made-to-help-you-learn/): conversational narration, learner pacing, minimal on-screen text, writing that matches the spoken explanation, and a visual cue showing exactly where to look. Khan Academy also [explicitly describes video as passive on its own](https://blog.khanacademy.org/how-khan-academy-helps-people-learn/) and pairs instruction with practice. The MathSolver default therefore remains a complete passive explanation, while Practice pauses is an optional retrieval layer rather than an interruption imposed on every viewer.

A real Gemini planning/review smoke on `2x + 3y = 1`, `-12x + 3y = 99` passed the new contract and independent review. Its lesson first interpreted the system as two conditions/line intersection, noticed the shared positive `3y` coefficient, justified subtraction, showed cancellation, contrasted the incorrect add-the-equations move, substituted, checked, and generalized the same-sign coefficient rule. The first two candidate rollouts exposed a Manim regression: substring focus coloring cannot split non-literal TeX or any fragment inside an aligned environment. Both candidates were removed from traffic, the renderer now limits focus isolation to balanced literal fragments in simple equations, and a regression test covers aligned systems. Private renderer revision `mathsolver-video-renderer-00009-7g8` then passed the exact disposable production smoke through schema-v2 planning/review, verified narration, five rendered private signed clip sets, Video Library lookup, and complete cleanup.

A later real user retry of the same elimination input failed before rendering because three internally repaired Gemini outputs still exceeded the original two-thirds equation-scene limit; the Cloud Task retry repeated the same failure, and the generic exception path mislabeled it `render_failed`. That ratio was a poor proxy for teaching quality because transformed and compared algebra is legitimately equation-heavy. Revision `mathsolver-video-renderer-00010-76r` instead requires at least two meaningful balance/graph/number-line/geometry scenes while retaining all role, purpose, action, misconception, comparison, verification, and generalization gates. Exhausted Pydantic validation now feeds a bounded fresh planning attempt and reports `planning_failed` if it still cannot converge. The exact reported input produced a five-chapter plan with two modeling scenes and passed the independent live reviewer before deployment.

That format can help a learner who already understands equations rehearse a procedure. A confused novice may imitate “subtract five, then divide by three” without understanding equality or transferring the strategy. The product should optimize for transfer, not video completion.

Research-backed requirements:

- **Learner-controlled segmentation:** short, individually replayable conceptual clips with Continue/Replay/Ask controls. Learner control improved transfer in narrated-animation experiments ([Mayer & Chandler, 2001](https://doi.org/10.1037/0022-0663.93.2.390)).
- **Meaningful, coordinated representations:** map symbols to a balance, algebra tiles, number line, graph, area model, or geometric diagram, and explicitly connect them. Multiple representations are useful only when learners can understand their relationship ([Ainsworth, 2006](https://doi.org/10.1016/j.learninstruc.2006.03.001)). Balance-model instruction improved students' algebraic reasoning and makes preservation of equality visible ([Otten et al., 2020](https://doi.org/10.3390/educsci10060163)).
- **Meaningful animation and signaling:** animate the mathematical change rather than decorative fades; highlight only what the narration currently discusses. Representational animation has more value than decorative animation ([Höffler & Leutner, 2007](https://doi.org/10.1016/j.learninstruc.2007.09.013)), and visual signaling improved transfer and matching while guiding attention ([Ozcelik et al., 2010](https://doi.org/10.1016/j.chb.2009.09.001)).
- **Phrase-level synchronization:** use TTS/STT forced alignment or word timestamps to schedule visual actions. Percent-of-scene timing is not sufficiently reliable.
- **Active prediction and retrieval:** pause before a reveal and ask one short question. Interpolated tests reduced mind wandering and improved learning in online lectures ([Szpunar et al., 2013](https://doi.org/10.1073/pnas.1221764110)).
- **Self-explanation and faded support:** ask why an operation is valid, then end with a similar problem whose first step is hidden. Combining self-explanation prompts with faded worked steps improved near- and far-transfer performance ([Atkinson et al., 2003](https://doi.org/10.1037/0022-0663.95.4.774)).
- **Dynamic construction over a talking head:** drawing or constructing the representation in sync with narration is more valuable than merely showing an instructor/avatar ([Fiorella et al., 2019](https://doi.org/10.1037/edu0000325)).
- **Adaptive depth:** provide a concise symbolic “Quick walkthrough” and a conceptual video-explanation path; one explanation is unlikely to fit both a reviewing expert and a novice.

For `3x + 5 = 20`, the conceptual path should show a balanced scale with three x-boxes plus five units against twenty units, remove five units from both pans, split the remaining fifteen into three equal groups, connect those actions back to `3x = 15` and `x = 5`, then ask for the first operation on `4x + 3 = 19`.

The deliverable should therefore be an **interactive micro-lesson manifest**—video/animation segments plus prediction prompts, feedback, and a transfer check—not only one MP4. Primary outcome metrics are “why” comprehension and near-transfer correctness; completion rate and watch time are secondary.

### Standalone concept prototype result

The isolated lab implemented this design on 2026-07-27 without changing the MathSolver application. The version-2 manifest renders six learner-controlled clips from fourteen separately synthesized narration phrases. It maps `3x + 5 = 20` to a balance, removes five units from both pans, redistributes fifteen units across three x-boxes, connects the representation to `x = 5`, and verifies the result. The player inserts three concept/prediction questions and a near-transfer first-step check using `4x + 3 = 19`.

The passive clip duration is 83.94 seconds, excluding learner thinking time. Browser QA exercised an incorrect equality answer and its corrective feedback, every correct checkpoint, transfer, completion, and replay/continue controls with no console errors. Gemini transcription QA passed all six combined clips with normalized script similarities from 0.9944 to 1.0.

This validates the artifact and interaction architecture, not the pedagogical outcome. The next gate is a small comparison of text solution versus narrated symbolic video versus interactive visual lesson, measuring equality reasoning and near-transfer correctness before application integration.

### Smooth-motion and quadratic follow-up

The 2026-07-28 animation audit identified two concrete defects in the first interactive render: only twelve unique frames were generated per second before 24 fps encoding, and each visual action was stretched across a complete multi-second narration phrase. The standalone engine now renders native 30 fps, starts actions at exact phrase boundaries, completes them in explicit 0.75–1.25 second smoothstep windows, and streams raw frames into FFmpeg rather than writing frame PNGs.

The upgraded engine rerendered the 83.94-second linear lesson at 30 fps in 18.09 seconds. A new regular high-school example teaches the factorable quadratic `x² − 5x + 6 = 0` through graph roots, the multiply/add factor-pair constraints, middle-term splitting, a box model, the zero-product rule, verification, and a near-transfer factor-pair question for `x² − 7x + 12 = 0`. It produces six clips and thirteen narration phrases totaling 69.86 passive seconds; the full Gemini-TTS-plus-render run took 35.02 seconds and produced a 1.62 MB 720p/30 fps review MP4. A 1.1-second sampled motion window contained 33 distinct frames.

All six quadratic voice clips passed Gemini transcription QA, and the complete browser path passed corrective feedback, three concept checks, transfer, and completion without console errors. This still establishes technical behavior rather than comparative learning gain.

The quadratic template is intentionally monic and factorable over the integers. Production scene selection must classify the problem first and route non-factorable, non-monic, repeated-root, irrational-root, and complex-root cases to appropriate templates such as completing the square or the quadratic formula. An LLM must not force every quadratic through factor-pair scenes.

### Systems-of-equations follow-up

The isolated lab added a third interactive lesson on 2026-07-28 for `2x + y = 11` and `x − y = 1`. Its six clips establish that one ordered pair must satisfy both equations, align the term columns, make cancellation of `+y` and `−y` visible, derive `3x = 12`, solve `x = 4`, substitute for `y = 3`, and verify `(4, 3)` in both equations and as the intersection of two lines. Three concept checkpoints and a transfer system test whether the learner can explain and reuse elimination.

The accepted render contains fourteen phrase-aligned narration segments, runs 87.69 seconds at 1280×720/30 fps, is 1.84 MB, and took 43.42 seconds end to end. All six voice clips passed transcription QA with normalized similarities from 0.9147 to 1.0. Browser QA passed deliberate wrong-answer feedback at every checkpoint, all correct answers, replay, transfer, completion, and media playback with no console errors.

The first TTS pass repeated phrases in two clips and spoke part of the silent direction in another, producing a 116.19-second export that failed transcription QA. The renderer now uses a stricter transcript-only prompt and rejects implausibly long voice clips using a word-count duration guard with up to three generation attempts. The accepted second pass demonstrates why TTS retries and transcription acceptance must remain part of the production pipeline rather than optional review steps.

This system template assumes one variable already has opposite coefficients. A production planner must route direct elimination, elimination after scaling, substitution, dependent systems, inconsistent systems, and approximate/graphical cases separately. The manifest remains curated; this test validates the template and QA pipeline, not automatic topic planning or student learning.

### Advanced calculus optimization follow-up

The isolated lab added a calculus optimization lesson on 2026-07-28 for a rectangle symmetric about the y-axis and inscribed under `y = 12 − x²`. The six clips animate the changing rectangle, identify width `2x` and height `12 − x²`, build `A(x) = 24x − 2x³`, solve `A′(x) = 0`, select the physical half-width `x = 2`, recover dimensions `4 × 8`, and verify the global maximum area of 32 using the second derivative and the area graph. Three concept checkpoints and a transfer model under `y = 18 − x²` test whether the learner can rebuild the reasoning.

The accepted render contains thirteen narration segments, runs 95.26 seconds at 1280×720/30 fps, is 2.32 MB, and took 73.64 seconds with two workers. All six voice clips passed transcription QA with similarities from 0.9003 to 0.9696. Browser QA passed deliberate wrong-answer feedback, all correct answers, replay, captions, transfer, completion, and media playback without warnings or errors.

The first four-worker attempt failed before rendering when one Gemini TTS read timed out. The request boundary now retries read timeouts in addition to HTTP/URL failures, and the accepted rerun used bounded two-worker concurrency. A production queue should make phrase jobs idempotent and resumable so one provider timeout does not discard successful parallel work.

This template remains curated. Production planning must distinguish interior and boundary optima, constrained models, nondifferentiable objectives, and multi-variable problems. A negative second derivative establishes a local maximum; the physical domain plus endpoint or graph analysis is required before presenting it as global.

### Integration boundary

The production path now starts from MathSolver's live completed problem and solve response, while deliberately keeping solving and lesson planning separate:

- `/api/solve` uses `MATH_TUTOR_PROMPT` and Gemini 3.1 Flash-Lite to stream a Markdown/LaTeX answer for the chat.
- `MessageList` passes the nearest user problem plus completed assistant solution to the video job endpoint; OCR-derived text is preserved when it is the usable problem statement.
- The renderer's separate Gemini 3.6 Flash pedagogy prompt uses the non-persistent Interactions API, chooses from equation, balance, graph, number-line, and bounded geometry primitives, and emits a strict Pydantic manifest, never code.
- A second low-temperature Gemini 3.6 Flash review compares the original problem, candidate solution, lesson equations/feedback, and transfer answer. It rejects ambiguity, wrong math, missing branches/domain constraints, and overclaims before TTS.
- Gemini 3.1 Flash TTS Preview runs once per narration phrase with bounded concurrency and retries; Gemini 3.6 Flash transcription plus duration guards are acceptance gates.
- Manim maps validated visuals to deterministic `Write`, matching/replacement transforms, graphs, number lines, balances, and geometry; FFmpeg emits browser-safe 1280×720/30 fps H.264/AAC clips, captions, and posters.

This boundary is intentionally safer than reusing `MATH_TUTOR_PROMPT`: the solve call produces the candidate mathematical explanation, while the planner teaches that result and the independent reviewer can refuse it. The next accuracy upgrade is symbolic per-equation verification beyond the current safe graph parser and independent model review.

The integrated localhost path passed a disposable verified-account smoke test on 2026-07-28 against private renderer revision `mathsolver-video-renderer-00003-8ps`: Cloud Tasks accepted `12x = 1`, the worker progressed through planning, review, voicing, and rendering, and the client verified three private signed clip/caption/poster sets plus the authenticated Video Library listing before cleanup. This revision fixes an older multi-segment equation crash by transforming only the equation `MathTex` nodes, not the containing card shapes. This validates the production-shaped pipeline, not student learning outcomes.

A later exact-input regression against renderer revision `mathsolver-video-renderer-00006-6l2` used damaged raw notation `x12=12y = y=3x+1` and a completed solution that explicitly interpreted it as `x=12y`, `y=3x+1`. It passed bounded planning/review, transcription-gated voice, three rendered clips, signed playback, Video Library lookup, and complete disposable cleanup. The reliability fix preserves rejection for silent/multiple interpretations, canonicalizes equivalent spoken/symbolic math before voice scoring, and does not lower the acceptance threshold.

### Playback product correction

The first integrated player over-applied the prototype's interaction research: it stopped after chapters, required repeated play actions, and forced questions into the main viewing path. The product contract is now **one explanation first, interaction optional**. The schema-v2 planner may still use several internal pedagogical scenes so it can orient, model, explain, contrast, verify, and generalize, but the renderer assembles them before upload into one continuous MP4, one continuous caption timeline, and one poster. The playback manifest exposes only that full lesson, with no numbered chapter UI or periodic stops. Narration must be complete without a quiz, cannot tell the viewer to pause or answer, and cannot claim passive viewers demonstrated transfer. The complete result is a typed, independently reviewed plan field rather than an incidental last segment; the final scene must state it during verification and the renderer must finish on a dedicated answer card held long enough to read. An explicit, off-by-default **Practice check** can present the transfer item only after the full video ends.

Captions also moved out of the picture into a dedicated transcript strip on web and Flutter so they cannot cover equations, annotations, or geometry. Renderer annotations are lifted above a lower safe zone, and WebVTT cues carry explicit positioning for fallback clients that still overlay them. The assembled VTT offsets every phrase by the measured duration of prior rendered scenes so captions remain synchronized across the complete movie. This preserves accessible captions without sacrificing the mathematical visual—the primary content.

### Renderer technology decision

The current Pillow + raw-frame FFmpeg engine remains valuable for cheap deterministic prototyping, layout experiments, timing validation, and small template benchmarks. It is not the strongest production engine for handwritten construction, path drawing, matching-LaTeX morphs, camera movement, or sophisticated continuity.

For the desired MathGPT-like teaching clips, the recommended production boundary is:

1. keep the Next.js/React lesson player for continuous playback, replay, caption-safe text, and opt-in questions/feedback/transfer;
2. use a separate Python Manim worker for math clip rendering from the validated typed manifest;
3. map approved schema actions to hand-written Manim primitives such as `Write`, `Create`, graph/geometry mobjects, attention cues, and `TransformMatchingTex`;
4. retain FFmpeg for concatenation/transcoding and the current TTS/transcription provider abstraction.

Manim is purpose-built for precise programmatic math animation and provides native simulated handwriting plus matching LaTeX transformations ([`Write`](https://docs.manim.community/en/stable/reference/manim.animation.creation.Write.html), [`TransformMatchingTex`](https://docs.manim.community/en/stable/reference/manim.animation.transform_matching_parts.TransformMatchingTex.html)). It is the best fit when mathematical construction quality is the priority.

[Motion Canvas](https://motioncanvas.io/docs/) is the strongest TypeScript alternative because it is explicitly designed for informative vector animations synchronized with voice-over and provides tweening, generator-based timing, and scene transitions. It would reduce language/runtime separation but require more custom math/LaTeX primitives. [Remotion](https://www.remotion.dev/docs/animating-properties) offers frame-driven React animation, springs, transitions, captions, players, and server rendering; it is useful for composition and maximum React reuse, but MathSolver would need to build handwriting and matching-equation behavior itself.

Gemini 3.1 Flash TTS remains suitable for the prototype because it supports exact-text speech, style prompting, and streaming, but Google labels it Preview and documents occasional inconsistency/errors. Continue splitting narration into short phrases, retaining retries, transcription QA, and a replaceable provider ([Gemini TTS guide](https://ai.google.dev/gemini-api/docs/speech-generation)).

## Recommended MathSolver design

Use a deterministic interactive scene system, not arbitrary LLM-generated Python or JavaScript:

```text
existing verified solve
  -> pedagogy plan (goal + misconception + representation)
  -> storyboard JSON (narration segments + typed visual actions + interactions)
  -> schema/LaTeX/accuracy validation
  -> per-scene TTS + phrase alignment + render jobs
  -> clips/captions + interaction manifest
  -> Cloud Storage/Mux + lesson player
```

For visual math quality, a small Manim render worker is the best fit. For maximum stack reuse, Remotion can create MP4s from React, but MathSolver would need to build more equation/graph primitives itself. A good typed scene schema should support only known primitives such as `title`, `equation`, `transformEquation`, `highlight`, `numberLine`, `coordinatePlane`, `plot`, `arrow`, and `caption`.

An MVP should:

- support one-variable algebra first, using 45–75 second videos and a small template set;
- implement a balance/algebra-tile representation rather than only symbolic fades;
- reuse the already-generated solution rather than solve the problem again;
- verify equations with SymPy or the existing graph-analysis primitives before rendering;
- render independent scenes in parallel, then concatenate;
- keep prediction/self-explanation and near-transfer prompts available through an explicit Practice pauses mode rather than interrupting default playback;
- synchronize visual actions to phrases/words rather than percentages of total audio duration;
- generate captions from the narration and disclose that the voice is AI-generated;
- use Cloud Tasks plus a separate Cloud Run render service/job with Python, Manim, LaTeX, and FFmpeg;
- store job/quota state in the existing Firestore database using server-only transactions and keep private videos private by default;
- cap free usage by authenticated user plus IP/device abuse signals.

This is an extension of MathSolver's existing Firebase account and Firestore foundation—not a new account/database build. The primary engineering work is the deterministic renderer and asynchronous video pipeline, plus server-side token verification, quota enforcement, and video storage/delivery.

## Storage and delivery decision before integration

MathSolver needs durable object storage for rendered clips, captions, posters, and lesson manifests, but it does not need Cloudflare R2 specifically. The first production integration should use a private regional Google Cloud Storage bucket in `us-central1`, colocated with the existing Cloud Run project and future render worker.

This choice keeps the first version operationally small:

- the worker uploads with its Google service-account identity instead of long-lived S3-compatible credentials;
- the API can issue short-lived signed `GET` URLs after verifying a Firebase ID token;
- Object Lifecycle Management can delete temporary fragments and expired free lessons automatically;
- video bytes go directly from object storage to the browser rather than through the Next.js or renderer service;
- the current 1.6–2.3 MB review MP4s make storage cost insignificant during validation.

Store only object keys and lifecycle metadata in Firestore, never video bytes or durable public URLs. A job can use a prefix such as `video-lessons/{uid}/{jobId}/` containing `manifest.json`, `clips/*.mp4`, `captions/*.vtt`, and `posters/*`. The player API should turn those keys into a short-lived playback response. Bucket CORS should allow only the production/local application origins needed for `GET`/`HEAD`, including caption loading. Signed URLs are bearer credentials and must not enter analytics, client persistence, or logs.

Recommended retention defaults are 24–48 hours for incomplete/temp artifacts, 7–14 days for free generated lessons, and a longer explicit retention window only for saved/paid lessons. The system should delete user-owned artifacts promptly when required by account deletion or a user delete action.

R2 is a later optimization when measured playback egress becomes material. Its Standard tier has low storage pricing and free Internet egress, but the current Google-hosted renderer would upload across providers, the application would need R2 API credentials plus bucket CORS, and presigned R2 URLs use the S3 API domain rather than a custom delivery domain. Hide the provider behind a small `MediaStore` interface so Google Cloud Storage can be replaced without changing job or player contracts.

Neither Google Cloud Storage nor R2 performs adaptive-video transcoding. The MVP can play the already encoded 720p MP4 clips with byte-range requests and publish each lesson clip as it completes. Add HLS or a managed video platform such as Mux only if startup latency, adaptive bitrate, global playback performance, or video analytics become real product requirements.

The minimum production flow is:

1. verify the Firebase ID token and verified-account status in a server endpoint;
2. reserve the free-video quota and create an idempotent Firestore job transaction;
3. enqueue Cloud Tasks to a private, separately scaled Cloud Run renderer;
4. validate the pedagogy plan and math with one bounded feedback-guided revision, generate/retry transcription-gated TTS phrases, render, and run audio/media QA; a damaged raw question is accepted only when its completed solution explicitly states one precise interpretation that the lesson discloses;
5. upload immutable lesson assets and save only their object keys plus status in Firestore;
6. return short-lived signed playback URLs to the authorized player;
7. expire artifacts using bucket lifecycle rules.

The current 43–74 second render measurements fit a Cloud Tasks-to-private-Cloud-Run-service design. If production jobs grow beyond the configured task deadline or need durable multi-stage orchestration, move rendering to Cloud Run Jobs or a workflow without changing the storage/player boundary.

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

# Codebase Map

Where everything lives. Use this to jump straight to the right file instead of exploring. Paths are from repo root. See [[product-overview]] for what each feature does and [[tech-and-ops]] for stack/deploy. Index: [[index]].

## Directory shape

```
src/
  app/                     # Next.js App Router
    page.tsx               # "/" — solver + landing in one (renders ChatArea)
    layout.tsx             # root layout: metadata, OpenGraph, GA4, providers, fonts
    sitemap.ts             # core/contact/calculator routes + live Pressroom article URLs
    robots.ts              # robots.txt — allows all, disallows /api/, base math-solver.io
    calculator/
      page.tsx             # "/calculator" — crawlable eight-category calculator hub
      opengraph-image.tsx  # generated 1200×630 hub social card
      [slug]/
        page.tsx           # 43 statically generated calculator pages + metadata/JSON-LD
        opengraph-image.tsx# topic-specific social card generated from the registry
    practice-tests/page.tsx# "/practice-tests" — library of saved tests (noindex)
    video-library/page.tsx # "/video-library" — private generated-video history (noindex)
    blog/
      page.tsx             # "/blog" — paginated live Pressroom article index
      error.tsx            # retryable blog API/configuration failure state
      [slug]/page.tsx      # rich article, metadata, author, JSON-LD, solver CTA
    auth/action/page.tsx   # "/auth/action" — noindex Firebase email action handler
    contact/page.tsx       # "/contact" — support/feedback form with Telegram delivery
    privacy/page.tsx       # web/mobile data disclosures, choices, retention, deletion
    terms/page.tsx         # web/mobile terms, free-product and update-policy contract
    account-deletion/page.tsx # public Apple/Play account and data deletion instructions
    api/
      solve/route.ts       # POST — Gemini streamed steps + trusted calculator-mode lookup
      ocr/route.ts         # POST — Gemini 3.1 flash-lite, image/PDF/drawing → expression text
      practice/route.ts    # POST — Gemini, generates MCQ quiz JSON from a solution
      practice/steps/route.ts # POST — per-question step-by-step explanation
      contact/route.ts     # POST — validate/rate-limit and deliver contact form to Telegram
      video/jobs/route.ts  # GET private library; POST verified auth/quota/queue dispatch
      video/jobs/[jobId]/route.ts # GET status/private signed playback; DELETE lesson
  components/
    chat/                  # the solver UI (the heart of the app)
      ChatArea.tsx         # top-level solver plus shared full-height ChatConversation transcript
      EmptyState.tsx       # homepage hero + footer
      SeoSections.tsx      # homepage SEO blocks + priority calculator internal links
      HeroInput.tsx        # first-message input (landing)
      ChatInput.tsx        # in-conversation input; file/paste/drag upload → /api/ocr
      MessageList.tsx      # messages: markdown+KaTeX, step dividers, quick actions + practice
      InlineMathInput.tsx  # rich math input wrapper
      MathFieldInput.tsx   # MathLive field
      MathKeyboard.tsx     # Σ on-screen math keyboard
      DrawingCanvas.tsx    # hand-draw a problem → JPEG → /api/ocr (source:"drawing")
      DraggableCalculator.tsx # basic arithmetic calc (framer-motion draggable); uses new Function()
    calculators/
      CalculatorPage.tsx   # server-rendered calculator article layout
      CalculatorExperience.tsx # swaps calculator article for the shared chat after submission
      CalculatorSolver.tsx # reusable first-message input and topic examples
      GraphingCalculator.tsx # reusable safe canvas plotter with multi-function controls
      MathFormula.tsx      # server-side KaTeX renderer for static formula content
    practice/
      PracticePanel.tsx    # quiz/review runner: normalized Markdown/KaTeX, answers, steps, mistake schedule, completion
      PracticeTestsPage.tsx# saved tests, best score, due mistake-review entry point
    auth/
      AccountButton.tsx    # Email/Password + Google auth dialog, account menu, sync status
      AuthActionHandler.tsx# verify/reset/recover code UI + safe return handling
    contact/
      ContactForm.tsx      # accessible first-name/email/message form and submit states
    video/
      VideoLessonDialog.tsx # auth gate, async job progress, retry/delete, modal shell
      InlineVideoLesson.tsx # persisted per-answer progress/player inside chat
      VideoLessonPlayer.tsx # one full video, persistent playback/full-screen controls, external captions, optional end practice
      VideoLibraryPage.tsx # account-owned ready/active/failed video cards + playback
    layout/
      Header.tsx           # mobile header; logo links to home
      Sidebar.tsx          # home-linked brand, navigation (incl. the dofollow, UTM/ref-tagged external AI Tutor link to eduzen.ai), local-first recent chats, account control
      SplitLayoutWrapper.tsx # resizable split view (solver | practice panel) via react-resizable-panels
    providers/
      ThemeProvider.tsx    # next-themes light/dark/system
      TurnstileProvider.tsx# Cloudflare Turnstile bot check
  context/
    AuthContext.tsx        # Firebase session, Google + verified Email/Password/reset journey
    ChatContext.tsx        # chats, review queue, scoped local cache, verified-only Firestore sync
    LearningProgressContext.tsx # guest/account local activity record and return measurement
    UIContext.tsx          # panel/calculator/practice/review UI state; calculator injection registry
  lib/
    captcha.ts             # configurable Turnstile validation; video creation requires action/hostname and fails closed
    contact.ts             # bounded contact-form parser + plain-text Telegram formatter
    calculators.ts         # typed registry facade, Algebra/precalc definitions, categories, validation
    calculus-calculators.ts# 8 Calculus definitions, intent instructions, SEO copy, examples, links
    linear-algebra-calculators.ts # 6 matrix/vector definitions, input hints, intent instructions
    trigonometry-calculators.ts # 3 Trigonometry definitions and intent instructions
    statistics-calculators.ts # 5 Statistics definitions and safeguards
    general-precalculus-calculators.ts # 4 General Math + 3 Precalculus definitions
    graphing-calculator.ts # Graphing definition and client-tool configuration
    gemini.ts              # server-only Gemini text/JSON generation + SSE stream adapter
    math-expression.ts     # safe recursive-descent expression parser used by graphing
    math-markdown.ts       # normalizes solver LaTeX without treating number-leading math as currency
    post-solution-actions.ts # step-header detection and one-tap follow-up prompts
    analytics.ts          # privacy-safe GA4 events + local return buckets
    learning-progress.ts   # pure review scheduling, daily activity, merge/streak logic
    pressroom.ts          # server-only sanitized list/article API, types, 5-minute cache
    pressroom-math.ts     # HTML-aware \\(...\\)/\\[...\\] authoring markers → safe server-rendered KaTeX
    firebase-auth-actions.ts # action-mode validation + same-origin continue URL guard
    firebase-client.ts     # env-gated Firebase App/Auth/Firestore Lite initialization
    firebase-notebook.ts   # one-shot Firestore Lite chat reads/writes and deletion tombstones
    firebase-admin.ts      # server-only ID-token verification + cross-project Admin clients
    video/
      client.ts            # authenticated browser job API
      create-job-handler.ts# shared verified-user creation; strict web Turnstile or preverified mobile App Check
      jobs.ts              # idempotent Firestore jobs, 10-per-UTC-day quota, refund/delete
      quota.ts             # pure daily-bucket normalization/reset math
      queue.ts             # Cloud Tasks OIDC dispatch; secret-gated local direct mode
      storage.ts           # private manifest validation + short-lived signed playback URLs
      types.ts             # shared job/playback contract
      validation.ts        # request, job, manifest, and object-prefix validation
      problem-context.ts   # selects the solved problem/solution pair from chat messages
  types/custom-elements.d.ts # MathLive custom element typings

mobile_app/                  # standalone Flutter iOS/Android client; no web source mixed in
  assets/fonts/              # bundled Manrope 500–800 (OFL) — brand display/heading/button face
  tool/                      # fetch ignored native Firebase config + run Flutter with local defines
  lib/
    dev/                     # gallery_main.dart: dev-only screenshot/state harness for simulator QA (not shipped)
    core/
      analytics/             # opt-in, no-content Firebase Analytics adapter
      auth/                  # native Firebase Email/Password + Google/Apple sessions
      config/                # API/Firebase dart defines and request/upload limits
      network/               # mobile v1 API, Firestore notebook sync, video/push clients
      reviews/               # native App Store/Play rating request policy and cooldown
      security/              # Firebase initialization + App Check token headers
      storage/               # guest-first notebook/settings, review, and per-lesson offline cache
      update/                # optional/requires-update client policy and local dismissal/cache
      theme/                 # light-first Material 3 tokens and adaptive component styles
      widgets/               # native LaTeX, safe text-entry sheet, shared screen layout
    features/
      app/                   # app state, notebook merge, review, analytics preferences
      onboarding/            # single-screen value/age first run; no launch permission
      home/                  # three-destination floating nav / tablet navigation rail
      solve/                 # crop/camera/worksheet OCR, streamed steps, verify/report
      work_check/            # handwritten-attempt first-error diagnosis
      notebook/              # segmented local solution + private video library
      practice/              # generated four-question quiz runner and warm-up
      profile/               # account sheet, progress, privacy, and appearance
      video/                 # private polling/player, controls, offline/share/push
  android/                   # io.mathsolver.app, camera/network, Play Integrity, signing hook
  ios/                       # io.mathsolver.app, App Attest/push/privacy entitlements
  store/google-play/         # reproducible Play icon/feature graphic/compliant phone screenshots + en-US listing source
  test/                      # widget, parser, work-check, review/persistence tests
  README.md                  # run/configuration and contract guide
  RELEASE.md                 # credential-safe store and production rollout checklist

# root
Dockerfile                 # standalone Next.js image for Cloud Run
cloudbuild.yaml            # Docker build with explicit Firebase public build arguments
.gcloudignore              # excludes local caches and the independent Flutter tree from web builds
deploy.sh                  # env-driven Cloud Build + tagged Cloud Run image deployment
next.config.ts             # output: "standalone", React Compiler
package.json               # deps & scripts
firebase.json              # Firestore rules/emulator configuration
firestore.rules            # verified-owner-only notebook rules + document validation
.firebaserc                # Firebase default math-solver-e3a55 + non-default Cloud Run alias
.env.example               # public Firebase names + server-only Gemini/Pressroom names
tests/firestore.rules.test.mjs # verified-owner/isolation/validation emulator tests
tests/firebase-auth-actions.test.mjs # email action mode/redirect safety tests
tests/post-solution-actions.test.mjs # short/long step extraction + prompt contract tests
tests/math-markdown.test.mjs # KaTeX regressions for number-leading math and currency
tests/pressroom-math.test.mjs # Pressroom HTML math rendering, safety, fallback, and idempotence
tests/learning-progress.test.mjs # spaced-review and local activity-state tests
tests/analytics.test.mjs # low-cardinality return interval contract
tests/video-problem-context.test.mjs # problem/solution selection including OCR context
tests/video-validation.test.mjs # request, manifest, and object-key safety contract
services/video-renderer/   # private FastAPI + schema-v2 pedagogy gate/review/TTS + meaning-first Manim/FFmpeg worker
infra/video/               # idempotent GCS/Cloud Tasks/IAM/TTL/CORS/lifecycle setup
```

Mobile-only server entries live under `src/app/api/mobile/v1/`: App-Check-aware
wrappers for OCR, solve, practice, Check My Work, verification, feedback,
private video jobs, verified-account FCM device registration and recent-login
account deletion, plus the public server-controlled app-version policy.

## Load-bearing files (touch with care)

- **`src/app/api/solve/route.ts`** — the solve prompt + streaming. Changing the prompt changes step formatting everywhere.
- **`src/components/chat/MessageList.tsx`** — renders solver markdown and KaTeX after `src/lib/math-markdown.ts` normalizes `\(..\)`/`\[..\]` to `$..$`/`$$..$$` and protects standalone currency dollar signs from math parsing. Horizontal rules become step dividers. Break this path and all math rendering breaks.
- **`src/context/ChatContext.tsx`** — the local-first persistence and sync coordinator. Guest/account browser caches, initial cloud merge, debounced cloud writes, deletions, uploaded-image handling, practice attempts, and derived mistake-review queues meet here.

## Data flow (one-liner)

Input (type / paste / photo / draw) → optional `/api/ocr` (Gemini) to get text → `/api/solve` (Gemini, streamed) → `MessageList` renders steps → optional `/api/practice` builds a Gemini-generated quiz → `PracticePanel`. First misses attach a review schedule to the saved question; `/practice-tests` reopens up to five due items in the same panel. State remains local-first in `ChatContext`; configured verified users also sync their private text/OCR/practice/review notebook through Firestore after streaming finishes. `LearningProgressContext` separately counts distinct local-day solve/practice/review activity for the sidebar goal and streak.

For “Generate video explanation,” `MessageList` selects the completed problem/solution pair → `/api/video/jobs` verifies a fresh Firebase ID token and email verification → a Firestore transaction reserves one of 10 generations in the current UTC-day bucket and creates an idempotent job → the originating assistant message syncs the private job ID/version and `InlineVideoLesson` shows progress independently of the modal → Cloud Tasks calls the private renderer with OIDC → Gemini treats the written solution only as an accuracy reference and plans a schema-v2 visual lesson → Pydantic rejects any plan missing orientation, concept modeling, strategy reasoning, misconception contrast, representation connection, verification/generalization, non-equation visuals, construct/highlight/compare actions, or a safe complete `finalAnswerLatex` → a separate Gemini reviewer checks both mathematics and teaching value, including the final result and its spoken verification, with one bounded feedback-guided revision and an explicit-clarification path for damaged input → verified phrase-level TTS feeds deterministic Manim scenes → the final scene always replaces its teaching visual with a 3.5-second `FINAL ANSWER` card → FFmpeg assembles one continuous H.264/AAC lesson MP4 and one continuous WebVTT timeline → private GCS stores the single-video manifest/media → the authorized job API validates object keys and returns 45-minute signed playback URLs to `VideoLessonPlayer`. The ready player replaces the inline progress attachment, exposes no chapter boundaries, keeps captions outside the math canvas, and can show one optional transfer check only after the full video. The control rail remains visible and includes full-screen. A missing Manim assembly fragment gets one fresh-directory retry; unsuccessful jobs refund only the matching daily bucket. The same endpoint's authenticated `GET` powers `/video-library`, which lists up to 24 unexpired account-owned jobs with short-lived signed posters; selecting a ready card reopens the existing lesson without regenerating or consuming another daily slot.

The Flutter client is a separate loop-first product: Home scan/photo/paste/type → crop/worksheet selection → editable OCR readback → streamed `/api/mobile/v1/solve` response → native step/LaTeX rendering with hint-first reveal and independent verification → private continuous video playback with optional practice pauses/offline/share → optional practice and scheduled mistake review. Check My Work uses its own multimodal route to diagnose the learner's first incorrect handwritten line. It deliberately imports no web UI code. Native Firebase Authentication provides verified Email/Password, Google, and Apple sessions with SDK-managed persistence; `AccountController` hydrates cold starts from the initial `authStateChanges()` event, tracks later sign-in/sign-out changes, and does not discard a restored session when a transient stream error occurs. Verified owners use UID-scoped notebook/offline stores; dirty retries, deletion tombstones, and post-save convergence prevent account switching or a stale in-flight upload from resurrecting another owner's data. The native store review API has two quiet milestones: at least three saved solutions plus 75% or better on a four-or-more-question practice/review set, or the fifth saved solve after its independent review is checked and the complete answer is visible for two seconds. Both share one local 120-day cooldown, with no custom sentiment gate or five-star copy. Video rendering is server-side: app inactivity stops only polling, then resume reauthorizes and continues the same deterministic job without a duplicate POST. App Check protects the mobile gateway without applying the web fallback quota. FCM registration follows an explicit per-account `Notify me when ready` choice and is removed on sign-out/account deletion; optional app updates are dismissible while hard gates require an explicit server-declared security or incompatible-protocol minimum. Store credentials and later native-only surfaces are the remaining boundaries. See [[mobile-app-concept]].

Calculator pages use the same data flow and the same `ChatConversation` interface as the homepage. On the first submission, `forceNewChat` creates a fresh chat with a `calculator:<slug>` source tag so an old active conversation cannot absorb the calculator problem. `/api/solve` validates that slug against the server registry and adds its trusted `solverInstruction`, so ambiguous input receives the operation intended by the page. The graphing route first evaluates explicit functions locally with the safe parser, then can send its visible functions into the shared tutor chat for explanation. See [[calculator-pages]].

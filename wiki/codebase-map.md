# Codebase Map

Where everything lives. Use this to jump straight to the right file instead of exploring. Paths are from repo root. See [[product-overview]] for what each feature does and [[tech-and-ops]] for stack/deploy. Index: [[index]].

## Directory shape

```
src/
  app/                     # Next.js App Router
    page.tsx               # "/" — solver + landing in one (renders ChatArea)
    layout.tsx             # root layout: metadata, OpenGraph, GA4, providers, fonts
    sitemap.ts             # core/calculator routes + live Pressroom article URLs
    robots.ts              # robots.txt — allows all, disallows /api/, base math-solver.io
    calculator/
      page.tsx             # "/calculator" — crawlable eight-category calculator hub
      opengraph-image.tsx  # generated 1200×630 hub social card
      [slug]/
        page.tsx           # 43 statically generated calculator pages + metadata/JSON-LD
        opengraph-image.tsx# topic-specific social card generated from the registry
    practice-tests/page.tsx# "/practice-tests" — library of saved tests (noindex)
    blog/
      page.tsx             # "/blog" — paginated live Pressroom article index
      error.tsx            # retryable blog API/configuration failure state
      [slug]/page.tsx      # rich article, metadata, author, JSON-LD, solver CTA
    auth/action/page.tsx   # "/auth/action" — noindex Firebase email action handler
    privacy/page.tsx       # static legal
    terms/page.tsx         # static legal
    api/
      solve/route.ts       # POST — Gemini streamed steps + trusted calculator-mode lookup
      ocr/route.ts         # POST — Gemini 3.1 flash-lite, image/PDF/drawing → expression text
      practice/route.ts    # POST — Gemini, generates MCQ quiz JSON from a solution
      practice/steps/route.ts # POST — per-question step-by-step explanation
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
      PracticePanel.tsx    # quiz/review runner: answers, steps, mistake schedule, completion
      PracticeTestsPage.tsx# saved tests, best score, due mistake-review entry point
    auth/
      AccountButton.tsx    # Email/Password + Google auth dialog, account menu, sync status
      AuthActionHandler.tsx# verify/reset/recover code UI + safe return handling
    layout/
      Header.tsx           # mobile header; logo links to home
      Sidebar.tsx          # home-linked brand, navigation, local-first recent chats, account control
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
    captcha.ts             # Turnstile verify + in-memory per-IP rate limit (60/hr) [not distributed]
    calculators.ts         # typed registry facade, Algebra/precalc definitions, categories, validation
    calculus-calculators.ts# 8 Calculus definitions, intent instructions, SEO copy, examples, links
    linear-algebra-calculators.ts # 6 matrix/vector definitions, input hints, intent instructions
    trigonometry-calculators.ts # 3 Trigonometry definitions and intent instructions
    statistics-calculators.ts # 5 Statistics definitions and safeguards
    general-precalculus-calculators.ts # 4 General Math + 3 Precalculus definitions
    graphing-calculator.ts # Graphing definition and client-tool configuration
    gemini.ts              # server-only Gemini text/JSON generation + SSE stream adapter
    math-expression.ts     # safe recursive-descent expression parser used by graphing
    post-solution-actions.ts # step-header detection and one-tap follow-up prompts
    analytics.ts          # privacy-safe GA4 event queue + return buckets
    learning-progress.ts   # pure review scheduling, daily activity, merge/streak logic
    pressroom.ts          # server-only list/article API, types, 5-minute cache
    firebase-auth-actions.ts # action-mode validation + same-origin continue URL guard
    firebase-client.ts     # env-gated Firebase App/Auth/Firestore initialization
    firebase-notebook.ts   # Firestore chat serialization, merge inputs, writes, deletion tombstones
  types/custom-elements.d.ts # MathLive custom element typings

# root
Dockerfile                 # standalone Next.js image for Cloud Run
cloudbuild.yaml            # Docker build with explicit Firebase public build arguments
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
tests/learning-progress.test.mjs # spaced-review and local activity-state tests
tests/analytics.test.mjs # low-cardinality return interval contract
```

## Load-bearing files (touch with care)

- **`src/app/api/solve/route.ts`** — the solve prompt + streaming. Changing the prompt changes step formatting everywhere.
- **`src/components/chat/MessageList.tsx`** — `preprocessLaTeX` normalizes `\(..\)`/`\[..\]` to `$..$`/`$$..$$`, protects currency dollar signs from math parsing, and turns horizontal rules into step dividers. Break this and all math rendering breaks.
- **`src/context/ChatContext.tsx`** — the local-first persistence and sync coordinator. Guest/account browser caches, initial cloud merge, debounced cloud writes, deletions, uploaded-image handling, practice attempts, and derived mistake-review queues meet here.

## Data flow (one-liner)

Input (type / paste / photo / draw) → optional `/api/ocr` (Gemini) to get text → `/api/solve` (Gemini, streamed) → `MessageList` renders steps → optional `/api/practice` builds a Gemini-generated quiz → `PracticePanel`. First misses attach a review schedule to the saved question; `/practice-tests` reopens up to five due items in the same panel. State remains local-first in `ChatContext`; configured verified users also sync their private text/OCR/practice/review notebook through Firestore after streaming finishes. `LearningProgressContext` separately counts distinct local-day solve/practice/review activity for the sidebar goal and streak.

Calculator pages use the same data flow and the same `ChatConversation` interface as the homepage. On the first submission, `forceNewChat` creates a fresh chat with a `calculator:<slug>` source tag so an old active conversation cannot absorb the calculator problem. `/api/solve` validates that slug against the server registry and adds its trusted `solverInstruction`, so ambiguous input receives the operation intended by the page. The graphing route first evaluates explicit functions locally with the safe parser, then can send its visible functions into the shared tutor chat for explanation. See [[calculator-pages]].

# Codebase Map

Where everything lives. Use this to jump straight to the right file instead of exploring. Paths are from repo root. See [[product-overview]] for what each feature does and [[tech-and-ops]] for stack/deploy. Index: [[index]].

## Directory shape

```
src/
  app/                     # Next.js App Router
    page.tsx               # "/" — solver + landing in one (renders ChatArea)
    layout.tsx             # root layout: metadata, OpenGraph, GA4, providers, fonts
    sitemap.ts             # sitemap: core routes + calculator hub + all calculator registry slugs
    robots.ts              # robots.txt — allows all, disallows /api/, base math-solver.io
    calculator/
      page.tsx             # "/calculator" — crawlable eight-category calculator hub
      opengraph-image.tsx  # generated 1200×630 hub social card
      [slug]/
        page.tsx           # 43 statically generated calculator pages + metadata/JSON-LD
        opengraph-image.tsx# topic-specific social card generated from the registry
    practice-tests/page.tsx# "/practice-tests" — library of saved tests (noindex)
    privacy/page.tsx       # static legal
    terms/page.tsx         # static legal
    api/
      solve/route.ts       # POST — Azure GPT-4o, streamed steps + trusted calculator-mode lookup
      ocr/route.ts         # POST — Gemini 3.1 flash-lite, image/PDF/drawing → expression text
      practice/route.ts    # POST — Azure GPT-4o, generates MCQ quiz JSON from a solution
      practice/steps/route.ts # POST — per-question step-by-step explanation
  components/
    chat/                  # the solver UI (the heart of the app)
      ChatArea.tsx         # top-level solver plus shared full-height ChatConversation transcript
      EmptyState.tsx       # homepage hero + footer
      SeoSections.tsx      # homepage SEO blocks + priority calculator internal links
      HeroInput.tsx        # first-message input (landing)
      ChatInput.tsx        # in-conversation input; file/paste/drag upload → /api/ocr
      MessageList.tsx      # renders messages: markdown+KaTeX, step dividers, practice button
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
      PracticePanel.tsx    # in-session quiz: answer check, score, per-question steps (score NOT persisted)
      PracticeTestsPage.tsx# /practice-tests page body; scans localStorage for saved tests
    layout/
      Header.tsx           # mobile header; logo links to home
      Sidebar.tsx          # home-linked brand, navigation, localStorage recent chats
      SplitLayoutWrapper.tsx # resizable split view (solver | practice panel) via react-resizable-panels
    providers/
      ThemeProvider.tsx    # next-themes light/dark/system
      TurnstileProvider.tsx# Cloudflare Turnstile bot check
  context/
    ChatContext.tsx        # chats, messages, streaming sendMessage, localStorage ("mathsolver_chats")
    UIContext.tsx          # panel/calculator/practice UI state; calculator injection callback registry
  lib/
    captcha.ts             # Turnstile verify + in-memory per-IP rate limit (60/hr) [not distributed]
    calculators.ts         # typed registry facade, Algebra/precalc definitions, categories, validation
    calculus-calculators.ts# 8 Calculus definitions, intent instructions, SEO copy, examples, links
    linear-algebra-calculators.ts # 6 matrix/vector definitions, input hints, intent instructions
    trigonometry-calculators.ts # 3 Trigonometry definitions and intent instructions
    statistics-calculators.ts # 5 Statistics definitions and safeguards
    general-precalculus-calculators.ts # 4 General Math + 3 Precalculus definitions
    graphing-calculator.ts # Graphing definition and client-tool configuration
    math-expression.ts     # safe recursive-descent expression parser used by graphing
  types/custom-elements.d.ts # MathLive custom element typings

# root
Dockerfile                 # standalone Next.js image for Cloud Run
deploy.sh                  # Cloud Run deploy — ⚠️ contains plaintext secrets, rotate & move out
next.config.ts             # output: "standalone", React Compiler
package.json               # deps & scripts
```

## Load-bearing files (touch with care)

- **`src/app/api/solve/route.ts`** — the solve prompt + streaming. Changing the prompt changes step formatting everywhere.
- **`src/components/chat/MessageList.tsx`** — `preprocessLaTeX` converts OpenAI's `\(..\)`/`\[..\]` to `$..$`/`$$..$$`, protects currency dollar signs from math parsing, and turns horizontal rules into step dividers. Break this and all math rendering breaks.
- **`src/context/ChatContext.tsx`** — the only persistence layer. All history, uploaded images (as data URLs), and generated tests are serialized here.

## Data flow (one-liner)

Input (type / paste / photo / draw) → optional `/api/ocr` (Gemini) to get text → `/api/solve` (Azure GPT-4o, streamed) → `MessageList` renders steps → optional `/api/practice` builds a quiz → `PracticePanel`. State + persistence throughout via `ChatContext`/`UIContext` + `localStorage`.

Calculator pages use the same data flow and the same `ChatConversation` interface as the homepage. On the first submission, `forceNewChat` creates a fresh chat with a `calculator:<slug>` source tag so an old active conversation cannot absorb the calculator problem. `/api/solve` validates that slug against the server registry and adds its trusted `solverInstruction`, so ambiguous input receives the operation intended by the page. The graphing route first evaluates explicit functions locally with the safe parser, then can send its visible functions into the shared tutor chat for explanation. See [[calculator-pages]].

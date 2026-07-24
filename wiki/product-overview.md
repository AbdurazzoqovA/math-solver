# Product Overview

What MathSolver does, feature by feature. For file locations see [[codebase-map]]. Index: [[index]].

## Positioning

Free, no-login, unlimited AI math solver. Core wedge vs competitors: **full step-by-step solutions are free** (Symbolab/Mathway/Wolfram/Photomath paywall them). See [[growth-strategy]].

## Features

- **AI solver chat** — conversational, streamed, multi-turn (full history sent back for follow-ups). Chats saved to `localStorage`, listed in the sidebar "Recent," deletable. This *is* the app; the solver and chat are the same surface.
- **Rich math input** — type plain text, or insert LaTeX via a MathLive field + Σ math keyboard (`InlineMathInput`, `MathFieldInput`, `MathKeyboard`).
- **Photo / PDF OCR** — drag-drop, paste, or file-pick images/PDFs (≤10MB). Extracted equation text is attached to the message. Model: Gemini 3.1 flash-lite via `/api/ocr`.
- **Drawing canvas** — hand-draw a problem (color, line width, undo, clear); exported at 2× as JPEG and sent through the same OCR pipeline (`source:"drawing"`). Almost no competitor offers draw-to-solve on web — currently unmarketed.
- **Practice quizzes** — "Take a Practice Test" on any solution generates 4 MCQs (`/api/practice`); opens in a resizable split panel (desktop) or full-screen (mobile). Per-question answer checking, wrong-answer tracking, running score, on-demand per-question step explanations (`/api/practice/steps`). **Scores are not persisted** — they reset when the panel reopens.
- **Practice library** — `/practice-tests` scans all `localStorage` chats for saved tests. Closest thing to progress tracking today. `noindex`.
- **Draggable calculator** — basic arithmetic (+−×÷), draggable; injects results into the active input.
- **Topic calculators** — `/calculator` links to 43 focused, indexed pages across General Math, Algebra, Precalculus, Trigonometry, Calculus, Linear Algebra, Statistics, and Graphing. Solver-backed pages configure the existing chat for one intent, supply example problems, stream full steps, support photo/PDF/drawing input and follow-ups, and include a formula guide, worked example, common mistakes, FAQs, and related tools. Each chat sends a validated page source so `/api/solve` can apply the correct server-owned operation instruction. See [[calculator-pages]].
- **Graphing calculator** — `/calculator/graphing` is a real client-side plotter, not an SEO-only shell. It supports up to four explicit functions, show/hide and remove controls, editable x/y ranges, pan, zoom, reset, coordinate tracing, an accessible sample-value table, and an "Explain this graph" handoff into the shared tutor chat. Expressions are evaluated by a reusable recursive-descent parser, not `eval`.
- **Home navigation** — the MathSolver brand in the desktop/mobile sidebar and the compact mobile header logo both link to `/`. Opening the home link from the mobile drawer also closes the drawer.

## How solving works

1. `ChatContext.sendMessage` POSTs to `/api/solve`.
2. `/api/solve` calls Azure OpenAI GPT-4o (temp 0.2, max 2000 tokens; the deployment/api-version live in the `AZURE_OPENAI_ENDPOINT` URL, not the code) with `MATH_TUTOR_PROMPT`, which forces numbered `**Step N:**` headers, `---` dividers, LaTeX for all math, and a `**Final Answer**` block. For calculator chats, the route validates the `calculator:<slug>` source and appends the matching server-owned topic instruction.
3. The route re-emits Azure's SSE as a clean `text/plain` token stream; the client reads it incrementally.
4. `MessageList` renders markdown via `react-markdown` + KaTeX; `preprocessLaTeX` normalizes delimiters; horizontal rules become styled step dividers.

## What it does NOT have (today)

- No accounts, no login, no server database, no cross-device sync.
- No streaks, bookmarks, saved scores, email capture, or notifications — **no retention layer**. This is the biggest product gap; see [[growth-strategy]].
- No monetization (no ads, no premium, no paywall).

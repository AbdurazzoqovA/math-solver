# Product Overview

What MathSolver does, feature by feature. For file locations see [[codebase-map]]. Index: [[index]].

## Positioning

Free, no-login, unlimited AI math solver. Core wedge vs competitors: **full step-by-step solutions are free** (Symbolab/Mathway/Wolfram/Photomath paywall them). See [[growth-strategy]].

## Features

- **AI solver chat** — conversational, streamed, multi-turn (full history sent back for follow-ups). Chats saved to `localStorage`, listed in the sidebar "Recent," deletable. This *is* the app; the solver and chat are the same surface.
- **One-tap solution follow-ups** — the latest completed answer exposes a compact "Keep learning" row. One accessible “Explain a step” picker scales from short answers to 20+ numbered steps; adjacent actions request a same-difficulty problem without revealing its answer or generate/reopen the existing four-question practice quiz. Actions disappear while a response is streaming, quiz failures show a retryable inline error, and saved quizzes on older answers remain reachable.
- **Rich math input** — type plain text, or insert LaTeX via a MathLive field + Σ math keyboard (`InlineMathInput`, `MathFieldInput`, `MathKeyboard`).
- **Photo / PDF OCR** — drag-drop, paste, or file-pick images/PDFs (≤10MB). Extracted equation text is attached to the message. Model: Gemini 3.1 flash-lite via `/api/ocr`.
- **Drawing canvas** — hand-draw a problem (color, line width, undo, clear); exported at 2× as JPEG and sent through the same OCR pipeline (`source:"drawing"`). Almost no competitor offers draw-to-solve on web — currently unmarketed.
- **Practice quizzes** — "Take a Practice Test" on any solution generates 4 MCQs (`/api/practice`); opens in a resizable split panel (desktop) or full-screen (mobile). Per-question answer checking, wrong-answer tracking, running score, on-demand per-question step explanations (`/api/practice/steps`). Finishing a test persists an attempt record with its first-try-correct score.
- **Mistake review** — a first wrong practice answer immediately marks that existing question for review instead of duplicating its content. `/practice-tests` offers a focused queue of up to five due mistakes. Correct reviews advance through 1→3→7→14-day intervals; another miss resets the interval to one day. Review remains attempt-first, includes the existing step help, and lets the learner remove an unsuitable question.
- **Practice library** — `/practice-tests` scans the local-first notebook for saved tests. Completed attempts are stored with each test (up to 20 recent attempts), the library shows the best score, and a compact status shows either the due-review CTA or next review date. The sidebar Practice Tests item also carries a due-count badge. `noindex`.
- **Daily goal + streak** — a quiet sidebar card counts two distinct learning activities per local day (`solve`, completed practice, or completed review). Before completion it recommends one concrete next action—start a solve, open due review, or open practice. Meeting the goal starts/extends a streak; missing a day resets the visible streak without blocking the solver. Progress is local-first, stored separately for guests and Firebase account UIDs, and guest progress merges into the account cache at sign-in.
- **Optional account + synced notebook foundation** — when Firebase is configured, the sidebar offers Google sign-in plus a complete Email/Password journey: registration, activation email, resend/check-verification controls, sign-in, password reset, return-state notices, session status, and sign-out. `/auth/action` provides the branded in-app handler for verification, reset, and recovery links once Firebase templates target it. Unverified Email/Password users remain local-only; verified users merge guest chats, their account cache, and private Firestore chats by ID/latest update. Chat text, OCR text, solutions, generated tests, and practice attempts sync across devices; original uploaded image data URLs stay browser-local. The no-account flow remains unchanged.
- **Draggable calculator** — basic arithmetic (+−×÷), draggable; injects results into the active input.
- **Topic calculators** — `/calculator` links to 43 focused, indexed pages across General Math, Algebra, Precalculus, Trigonometry, Calculus, Linear Algebra, Statistics, and Graphing. Solver-backed pages configure the existing chat for one intent, supply example problems, stream full steps, support photo/PDF/drawing input and follow-ups, and include a formula guide, worked example, common mistakes, FAQs, and related tools. Each chat sends a validated page source so `/api/solve` can apply the correct server-owned operation instruction. See [[calculator-pages]].
- **Graphing calculator** — `/calculator/graphing` is a real client-side plotter, not an SEO-only shell. It supports up to four explicit functions, show/hide and remove controls, editable x/y ranges, pan, zoom, reset, coordinate tracing, an accessible sample-value table, and an "Explain this graph" handoff into the shared tutor chat. Expressions are evaluated by a reusable recursive-descent parser, not `eval`.
- **Home navigation** — the MathSolver brand in the desktop/mobile sidebar and the compact mobile header logo both link to `/`. Opening the home link from the mobile drawer also closes the drawer.

## How solving works

1. `ChatContext.sendMessage` POSTs to `/api/solve`.
2. `/api/solve` calls Gemini 3.1 flash-lite (temp 0.2, max 2000 output tokens) with `MATH_TUTOR_PROMPT`, which forces numbered `**Step N:**` headers, `---` dividers, LaTeX for all math, and a `**Final Answer**` block. For calculator chats, the route validates the `calculator:<slug>` source and appends the matching server-owned topic instruction.
3. The shared Gemini adapter converts provider SSE into a clean `text/plain` stream; the client reads it incrementally.
4. `MessageList` renders markdown via `react-markdown` + KaTeX; `preprocessLaTeX` normalizes delimiters; horizontal rules become styled step dividers.

## What it does NOT have (today)

- Firebase's verification/reset email templates still need to target the new custom `/auth/action` route after that route is deployed; until then emails open Firebase's hosted action page first.
- No bookmarks, folders/courses, topic mastery dashboard, customizable goals, email capture, or notifications. The shipped streak is intentionally device-local/account-scoped rather than a Firestore-synced cross-device record; see [[growth-strategy]].
- No monetization (no ads, no premium, no paywall).

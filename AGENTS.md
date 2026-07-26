# AGENTS.md — MathSolver

> **Read this first.** This file is the single entry point for any AI agent (Codex, Claude Code, or other) working on this repo. It exists so you can orient in ~2 pages instead of re-reading the whole codebase every session. Claude Code reads `CLAUDE.md`, which points here — so this file is the one source of truth for both.

## What this project is

**MathSolver** (`math-solver.io`) — a free, no-login web math solver. Students type, paste, photograph, or hand-draw a math problem and get streamed step-by-step solutions, plus auto-generated practice quizzes. The core product remains usable without an account. Optional Firebase Authentication is configured in `math-solver-e3a55`, including verified Email/Password and Google journeys. Firestore and verified-account rules are live, and the private notebook passed live owner/isolation tests. See [[tech-and-ops]].

Goal driving current work: **grow Google organic traffic** (the "math solver" keyword universe is ~8M searches/mo) **and increase return visits**. See `wiki/growth-strategy.md`.

## The knowledge base (this repo's "wiki")

Durable project knowledge lives in `wiki/` as interlinked markdown (Obsidian `[[wikilinks]]`). It is maintained by agents, not hand-written by the user. Before doing real work, read [[index]] (the catalog), then drill into the specific page you need. Don't re-derive facts that are already written down. (To browse the graph in Obsidian, open the **repo root** as the vault, not `wiki/`.)

| When you need to… | Read |
|---|---|
| Find where a feature/route/component lives | [[codebase-map]] |
| Understand what the product does & its features | [[product-overview]] |
| Stack, hosting, deploy, env vars, known gotchas | [[tech-and-ops]] |
| The growth/SEO/retention plan & roadmap | [[growth-strategy]] |
| Catalog of all wiki pages | [[index]] |
| What changed & when | [[log]] |

## Fast facts (so you don't have to grep)

- **Stack:** Next.js 16 (App Router, React 19, React Compiler), TypeScript, Tailwind v4. Math via KaTeX + `react-markdown` + `remark-math`/`rehype-katex`; input via `mathlive`.
- **Solver:** Google **Gemini 3.1 flash-lite** — `src/app/api/solve/route.ts`, streamed through `src/lib/gemini.ts`. Prompt `MATH_TUTOR_PROMPT` forces `**Step N:**` format.
- **OCR (photo/PDF/drawing → text):** Google **Gemini 3.1 flash-lite** — `src/app/api/ocr/route.ts`. Extracts the expression only; does not solve.
- **Practice quizzes:** Gemini 3.1 flash-lite — `src/app/api/practice/route.ts` + `/steps`.
- **State:** `src/context/ChatContext.tsx` (local-first chats, mistake queue, optional Firestore sync), `src/context/LearningProgressContext.tsx` (local daily goal/streak), `src/context/AuthContext.tsx` (optional Firebase Email/Password or Google account), `src/context/UIContext.tsx` (panels/calculator/practice/review).
- **Routes:** `/` (solver + landing), `/calculator` + 43 static calculator pages across eight categories, `/practice-tests` (noindex), `/privacy`, `/terms`.
- **Hosting:** Google Cloud Run via `deploy.sh` + `Dockerfile` (`output: "standalone"`).
- **Analytics:** GA4 (`G-YG1NPYM8BS`) plus the no-content retention event contract in `src/lib/analytics.ts`; never attach math content, identity fields, or notebook IDs.

## Rules for working here

1. **⚠️ Secrets:** the owner-side `deploy.sh` currently contains plaintext API keys (including legacy Azure config, Google Cloud, and Turnstile). Do **not** add more secrets to tracked files; these should be rotated and moved to secret management. Never print or commit keys.
2. **Firebase is optional and split from hosting.** `math-solver-e3a55` owns Email/Password + Google Auth and the Firestore notebook; `axial-willow-428621-n4` remains Cloud Run only. Guests use `localStorage`. Firestore exists in `nam5`, and the checked-in verified-account rules are live. Do not assume Storage or other backend services exist. See [[tech-and-ops]].
3. **Keep the wiki current.** After any change that alters architecture, features, routes, or the plan, update the relevant `wiki/` page, bump [[index]] if pages were added/removed, and append one line to [[log]]. This is what keeps future sessions cheap. See the workflow below. Use `[[wikilinks]]` for any new cross-references so the Obsidian graph stays connected.
4. **Math rendering is fragile.** LaTeX delimiters are preprocessed (`\(..\)`→`$..$`) in `MessageList.tsx`. Test rendering after touching the solve/render path.

## Wiki maintenance workflow

- **Ingest** (new source/decision worth keeping): read it → update the relevant wiki page(s) → update `wiki/index.md` if the page set changed → append a dated line to `wiki/log.md`.
- **Query** (answering a question from the wiki): read `wiki/index.md` first, then the specific pages. If the answer is a durable insight, file it back as/into a wiki page rather than losing it to chat.
- **Lint** (periodic health check, on request): scan for stale claims (e.g. a "planned" feature that shipped), contradictions, orphan pages, and missing cross-references; fix and log.

Log entry format (parseable): `## [YYYY-MM-DD] <ingest|query|lint|change> | <short title>`

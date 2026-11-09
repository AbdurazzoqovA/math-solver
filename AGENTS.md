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
- **Mobile:** standalone Flutter 3.44/Dart 3.12 iOS/Android client in `mobile_app/`, publicly available on the App Store and Google Play; never mix its source into the Next.js root. The App-Check-aware `/api/mobile/v1/*` client includes camera crop/worksheet capture, Check My Work, verified streamed steps, practice/review, native Email/Password + Google/Apple auth, Firestore notebook sync, private visual lessons with offline/share/push, and opt-in no-content analytics. The app sells no subscriptions (store IAP is not implemented); a web plan bought on `/pricing` applies to the same account. APNs setup, broader App Check enforcement, and later device-only surfaces remain operations/roadmap work.
- **Billing (live since 2026-10-31):** Stripe Checkout + Customer Portal, web only. Catalog in `src/lib/billing/plans.ts` (Free / Plus $4.99 mo · $29.99 yr / Unlimited $9.99 mo · $59.99 yr, no free trial); prices are found by Stripe lookup key, created by `node scripts/stripe-setup.mjs`. Routes under `src/app/api/billing/*`; entitlements are server-only Firestore docs under `users/{uid}/entitlements/`; the video daily limit comes from the plan tier, and `src/lib/billing/usage.ts` meters Free scans (5/day) and quizzes (1/day) for users (Firestore) and web guests (signed cookie, `GUEST_USAGE_SECRET`). Typed step-by-step solving stays free. Billing incidents, payments, and AI-provider refusals notify the owner's Telegram chat through `src/lib/owner-alerts.ts` (`BILLING_TELEGRAM_*`; billing kinds in `src/lib/billing/alerts.ts`, provider kinds in `src/lib/llm-alerts.ts`). See [[monetization]].
- **Solver:** switchable Anthropic **Claude Haiku 5.5** / Azure **gpt-4.1-nano** / Google **Gemini 3.1 flash-lite** (`LLM_PROVIDER`) — `src/app/api/solve/route.ts`, streamed through `src/lib/llm.ts`. Prompt `MATH_TUTOR_PROMPT` forces `**Step N:**` format. Check [[tech-and-ops]] for the active production provider.
- **OCR (photo/PDF/drawing → text):** the selected Anthropic/Azure/Gemini LLM — `src/app/api/ocr/route.ts`. Extracts the expression only; does not solve.
- **Practice quizzes:** the selected Anthropic/Azure/Gemini LLM — `src/app/api/practice/route.ts` + `/steps`.
- **Interactive visual lessons:** verified accounts get five private, asynchronous micro-lessons from the latest completed solution — `src/app/api/video/jobs`, `src/components/video`, and `src/lib/video`. Cloud Tasks calls the private `services/video-renderer` Cloud Run worker, which uses typed Gemini plan/review (independent `VIDEO_LLM_PROVIDER`), switchable Azure/Gemini TTS with Gemini transcription QA, Manim/FFmpeg, and private signed GCS playback.
- **State:** `src/context/ChatContext.tsx` (local-first chats, mistake queue, optional Firestore sync), `src/context/LearningProgressContext.tsx` (local daily goal/streak), `src/context/AuthContext.tsx` (optional Firebase Email/Password or Google account), `src/context/UIContext.tsx` (panels/calculator/practice/review).
- **Routes:** `/` (English solver + landing), 15 translated language homepages (`/es`, `/ru`, `/uz`, etc.), `/calculator` + 43 static calculator pages across eight categories, `/blog` + dynamic Pressroom articles, `/practice-tests` (noindex), `/privacy`, `/terms`.
- **Hosting:** the Next.js web/API app runs on Azure Container Apps (`mathsolver`, resource group `mathsolver-azure`, min 1 / max 20) behind the unchanged Cloudflare domain. Read [[azure-migration]] before any hosting/deployment change. Root `deploy.sh` targets legacy Google Cloud Run, NOT production Azure; do not use it for ordinary web releases. Visual lessons still use the separate private Cloud Run renderer, Cloud Tasks, and regional GCS bucket; deploy renderer-only with `VIDEO_UPDATE_WEB_SERVICE=false`.
- **Analytics:** Website GA4 (`G-YG1NPYM8BS`) loads without an in-product consent popup; mobile analytics are opt-in. The no-content event adapter lives in `src/lib/analytics.ts`. Never attach math content, identity fields, or notebook IDs.
- **Ads:** the Google AdSense loader (`ca-pub-5558010343849231`) is the only `<head>` script in `src/app/[locale]/layout.tsx`, with `public/ads.txt`. Auto ads are OFF; five manual units are placed by `src/components/ads/AdSlot.tsx` (under finished answers, homepages, calculator guides/hub, blog), never for Plus/Unlimited. Keep other inline/`next/script` tags out of `<head>` (hydration mismatch). See [[monetization]].
- **Blog:** Pressroom server API (`PRESSROOM_API_KEY`) → dynamic `/blog` and `/blog/[slug]`, cached for five minutes. The key must remain server-only.

## Rules for working here

1. **⚠️ Secrets:** `deploy.sh` is safe to track and loads its values from ignored local `.env` files. Do **not** add API keys, service-account files, or other credentials to tracked files. Never print or commit keys.
2. **Firebase is optional and split from hosting.** `math-solver-e3a55` owns Email/Password + Google + Apple Auth and the Firestore notebook; `axial-willow-428621-n4` retains the private renderer, queue, video bucket, and legacy web rollback deployment. Azure web access uses keyless federation, not a service-account private key. Guests use `localStorage`. Firestore exists in `nam5`, and the checked-in verified-account rules are live. Do not assume Firebase Storage or other backend services exist. See [[tech-and-ops]].
3. **Keep the wiki current.** After any change that alters architecture, features, routes, or the plan, update the relevant `wiki/` page, bump [[index]] if pages were added/removed, and append one line to [[log]]. This is what keeps future sessions cheap. See the workflow below. Use `[[wikilinks]]` for any new cross-references so the Obsidian graph stays connected.
4. **Math rendering is fragile.** LaTeX delimiters are preprocessed (`\(..\)`→`$..$`) in `MessageList.tsx`. Test rendering after touching the solve/render path.

## Wiki maintenance workflow

- **Ingest** (new source/decision worth keeping): read it → update the relevant wiki page(s) → update `wiki/index.md` if the page set changed → append a dated line to `wiki/log.md`.
- **Query** (answering a question from the wiki): read `wiki/index.md` first, then the specific pages. If the answer is a durable insight, file it back as/into a wiki page rather than losing it to chat.
- **Lint** (periodic health check, on request): scan for stale claims (e.g. a "planned" feature that shipped), contradictions, orphan pages, and missing cross-references; fix and log.

Log entry format (parseable): `## [YYYY-MM-DD] <ingest|query|lint|change> | <short title>`

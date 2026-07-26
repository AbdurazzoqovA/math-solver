# Log

Chronological, append-only. Newest at bottom. Format: `## [YYYY-MM-DD] <ingest|query|lint|change> | <title>`
Parse recent entries with: `grep "^## \[" wiki/log.md | tail -5`

## [2026-07-24] ingest | Knowledge base created
Set up the agent knowledge base following the "LLM Wiki" pattern. Created `AGENTS.md` (canonical entry point, read by Codex + Claude), `CLAUDE.md` (thin pointer to AGENTS.md), and `wiki/` with `index.md`, `codebase-map.md`, `product-overview.md`, `tech-and-ops.md`, `growth-strategy.md`, and this log. Codebase facts verified against the source tree; growth strategy distilled from July 2026 market research (artifact: https://claude.ai/code/artifact/472a8bcd-7183-44a8-8ab7-c7e23babe8a0). Goal: future agents ramp up from these pages instead of re-exploring the whole repo.

## [2026-07-24] change | Converted cross-links to Obsidian wikilinks
Replaced Markdown-style `[text](file.md)` cross-references with `[[wikilinks]]` across AGENTS.md, CLAUDE.md, and all wiki pages so the Obsidian graph view connects properly. Added a few extra cross-links (e.g. growth-strategy → product-overview/tech-and-ops) to reduce leaf/sink nodes. Note for graph: open the **repo root** as the Obsidian vault, not the `wiki/` subfolder, so AGENTS.md and CLAUDE.md are included.

## [2026-07-24] ingest | Expanded growth-strategy to full detail
The initial growth-strategy.md was a compressed summary; the full detail (9-tool competitor table, all 10 gaps, evidence-backed retention list, metrics) lived only in the artifact URL. Rewrote it to be **self-contained** — memory no longer depends on the artifact. Added a concrete SEO **page-build list** with real slugs: ~35 `/calculator/{topic}` pages grouped by subject, plus the alternative/comparison page slugs. This answers "which pages do we need" explicitly.

## [2026-07-24] lint | Accuracy audit vs source
Verified wiki claims against the actual code. Confirmed: localStorage key `mathsolver_chats`, solve temp 0.2/max_tokens 2000, OCR model `gemini-3.1-flash-lite`, GA4 `G-YG1NPYM8BS`, sitemap = only /,/privacy,/terms, rate-limit `RATE_LIMIT_MAX=60`/hr. Corrected: previously stated Azure `deployment gpt-4o, api-version 2025-01-01-preview` as fact — the routes fetch `AZURE_OPENAI_ENDPOINT` as-is, so those live in the env URL, not the source; softened the claim in tech-and-ops and product-overview. Minor code smell noted (not a wiki error): `captcha.ts` doc comment says "30 req/hr" but the enforced constant is 60.

## [2026-07-24] change | Launched Algebra and precalculus calculator pages
Added `/calculator` plus 13 statically generated calculator routes backed by one typed content registry and one reusable solver client. Each page includes unique metadata, canonical, generated OG/Twitter card, WebPage/BreadcrumbList/WebApplication JSON-LD, human-edited topic content, worked examples, visible FAQs, and curated internal links. Expanded the sitemap and homepage/sidebar navigation, added `forceNewChat` isolation for the first calculator submission, removed retired FAQPage schema, and documented the keyword map, cannibalization rules, architecture, and verification in [[calculator-pages]].

## [2026-07-24] change | Matched calculator pages to the main solver layout
Replaced the split landing-page hero on every topic calculator with the product's centered solver pattern: page title and short context first, then one prominent calculator with examples directly below. Removed the promotional badges and kept the supporting SEO content beneath the working tool.

## [2026-07-24] change | Reused the main chat experience on calculator routes
Removed the calculator-specific result cards. Submitting a calculator problem now replaces the article with the same full-height, streaming chat surface used on the homepage, including automatic transcript scrolling, the bottom-pinned follow-up composer, continued questions, practice tests, and responsive mobile behavior. Calculator chats are isolated and associated with their originating route through a `calculator:<slug>` source tag.

## [2026-07-24] change | Launched the Calculus calculator category
Added eight indexed calculator routes for derivatives, indefinite and definite integrals, limits, partial derivatives, implicit differentiation, Taylor series, and series convergence. Expanded the hub to 21 calculators, updated metadata and the dynamic hub OG count, added server-validated topic instructions for ambiguous Calculus input, added registry quality checks, confirmed all new routes and OG images, tested the shared mobile chat with live derivative solves, and updated [[calculator-pages]], [[growth-strategy]], [[product-overview]], [[tech-and-ops]], and [[codebase-map]].

## [2026-07-24] change | Launched the Linear Algebra calculator category
Added six indexed calculator routes for matrix operations, determinants, matrix inverses, eigenvalues and eigenvectors, dot products, and cross products. Expanded the hub to 27 calculators and the sitemap to 31 URLs, added reusable one-line matrix/vector input hints, server-trusted operation instructions, Linear Algebra internal links and homepage entries, and stricter registry checks. Verified the production build, every route and OG image, a 390 × 844 mobile layout, and a live determinant solve in the shared chat. Updated [[calculator-pages]], [[growth-strategy]], [[product-overview]], [[tech-and-ops]], and [[codebase-map]].

## [2026-07-24] change | Completed the first-wave calculator taxonomy and graphing tool
Added 16 indexed routes across Trigonometry, Statistics, General Math, Precalculus, and Graphing, bringing the registry to 43 calculators and the sitemap to 47 URLs. Shipped unique keyword metadata, generated OG cards, server-trusted solver instructions, subject-specific SEO content, expanded internal links, stricter registry validation, currency-safe math rendering, and a reusable no-eval graphing engine with multi-function canvas controls and chat explanation. Verified the production build, all new routes and OG images, mobile layouts, multi-curve graphing, and live unit-circle, standard-deviation, inverse-function, graph-explanation, and word-problem solves. Updated [[calculator-pages]], [[growth-strategy]], [[product-overview]], [[tech-and-ops]], [[codebase-map]], and AGENTS.md.

## [2026-07-24] change | Recorded calculator deployment and linked the logo home
Recorded the user's confirmation that the complete 43-calculator, 47-URL release reached production. Updated the shared desktop/mobile brand and compact mobile header logo to link accessibly to `/`; the mobile drawer closes when its brand link is used. Updated [[calculator-pages]], [[growth-strategy]], [[product-overview]], [[tech-and-ops]], and [[codebase-map]].

## [2026-07-26] change | Added optional Firebase account and synced notebook foundation
Added configuration-gated Firebase Web initialization, optional Google sign-in, owner-only Firestore chat documents and tested security rules, scoped local account caches, guest/account/cloud merge, debounced post-stream writes, cloud deletion, sync status UI, Docker build arguments, and setup documentation targeting the existing `axial-willow-428621-n4` Google Cloud project. The app remains fully local/no-login when Firebase is unconfigured; live project attachment, region selection, Auth/Web app setup, production build values, and rules deployment remain owner prerequisites. Cloud sync strips uploaded image data URLs but retains OCR context. Completed practice attempts now persist with saved tests and the library shows each best score. Updated AGENTS.md, [[product-overview]], [[tech-and-ops]], [[growth-strategy]], and [[codebase-map]].

## [2026-07-26] query | Distinguished Cloud Run and Firebase candidate projects
Paused external Firebase setup after owner uncertainty about project selection. Local repository and gcloud-default evidence identify `axial-willow-428621-n4` as the existing Cloud Run project in `us-central1`; read-only Firebase inspection identifies `math-solver-e3a55` as the project owning the supplied Admin SDK identity, active Firebase project, registered matching Web app, and enabled Email/Password plus Google Auth. Firestore and the production authorized domain are not configured there. Removed active Web targeting from ignored `.env.local` and changed `.firebaserc` to named aliases with no default, preventing accidental deployment. Recommended retaining axial for hosting and confirming math-solver-e3a55 as a separate Firebase data project if the owner accepts the split; no external state was changed.

## [2026-07-26] ingest | Confirmed split Cloud Run and Firebase project architecture
Owner confirmed `axial-willow-428621-n4` remains exclusively the Cloud Run build/hosting project and `math-solver-e3a55` is the Firebase Authentication/Firestore data project. Restored the latter as `.firebaserc`'s Firebase default and restored its public Web configuration only in ignored `.env.local`; Cloud Run deployment targeting remains unchanged.

## [2026-07-26] change | Configured and live-tested Firebase Authentication
Verified the ignored Web config exactly matches the registered `math-solver-e3a55` Web app, confirmed Email/Password and Google providers, added `math-solver.io` as an authorized domain, and completed a live temporary Email/Password create/sign-in/delete roundtrip. Added an Email/Password + Google account dialog to the app while preserving no-login use. The configured production build, touched-file lint, TypeScript, and four owner-isolation Firestore emulator tests pass. Firestore could not be enabled or receive rules because the supplied Firebase Admin SDK identity lacks Service Usage permission; owner API enablement remains the sole backend blocker.

## [2026-07-26] change | Applied official Google sign-in branding
Replaced the generic account silhouette in the “Sync your notebook” dialog with Google's pre-approved light “Sign in with Google” button asset while preserving the Firebase popup flow. The exact official asset path is allowlisted through Next's image optimizer so the logo, type, spacing, colors, and boundary stay aligned with Google's current sign-in branding guidance.

## [2026-07-26] change | Added one-tap post-solution learning actions
Replaced the latest answer's single oversized practice CTA with a horizontally scrollable “Keep learning” row that detects numbered solution steps, sends contextual “explain step N” follow-ups, requests a same-difficulty problem without revealing its answer, and generates or reopens the existing practice quiz. Actions are suppressed during streaming and on failed solves; historical saved-practice access remains intact. Added isolated parsing/prompt helpers and updated [[product-overview]], [[growth-strategy]], and [[codebase-map]].

## [2026-07-26] change | Completed verified authentication journey
Added Email/Password activation with resend and return-state refresh, password reset with neutral account-discovery messaging, Google sign-in, account/session status, and verified-only cloud notebook gating in both the client and Firestore rules while keeping guest mode local-first. The five-case rules emulator suite passes. Live Auth accepted temporary signup, verification-email, reset-email, sign-in, and cleanup tests; Firestore exists in Native mode at `nam5` and rejects anonymous, cross-user, and unverified access. The supplied service account cannot publish rules (`403`), so an owner rules deployment and verified-owner retest remain.

## [2026-07-26] change | Switched solver and practice from Azure to Gemini
Replaced the failing local Azure-only solution and practice calls with a shared server-only Gemini 3.1 flash-lite adapter while retaining streamed step formatting and structured quiz JSON. Reused the owner’s existing Gemini credential only in ignored local configuration, documented `GOOGLE_CLOUD_API_KEY` plus optional `GEMINI_MODEL`, updated privacy/provider documentation, and verified a real local streamed solve plus a four-question practice response.

## [2026-07-26] change | Verified live Firestore rules and added direct email actions
Recorded the owner-published verified-account rules after live owner chat/tombstone CRUD and unverified/cross-user/anonymous/malformed denial tests passed. Added a noindex `/auth/action` handler for verification, password reset, and email recovery with same-origin continue guards, branded success/error states, and safe session return handling. Firebase verification/reset templates still need to target the route after deployment.

## [2026-07-26] change | Fixed and scaled post-solution actions
Fixed the transparent composer gradient intercepting clicks on Explain, Similar problem, and Quiz me by limiting pointer events to the composer itself. Replaced per-step chips with one native accessible step picker that scales to 20+ steps, added visible retryable quiz errors, and preserved the similar-problem no-answer prompt. A real Gemini-completed answer passed browser checks for short/20-step pickers, Explain and Similar request payloads, quiz loading/failure/retry, and the four-question practice-panel transition.

## [2026-07-26] change | Added mistake review and a daily learning streak
Persisted first-attempt practice mistakes on their existing saved questions, added a five-item due queue and reusable review mode with 1→3→7→14-day scheduling, one-day lapse resets, and manual removal, and made those schedules part of the existing verified notebook sync. Added a separate privacy-light local progress layer that counts two distinct solve/practice/review activities per local day, merges guest progress into UID-scoped browser storage, and shows a quiet sidebar goal/streak. Unit tests cover scheduling, merge, rollover, and streak behavior; browser checks covered wrong-answer persistence, due review, interval advance, successful solve credit, and daily-goal completion.

## [2026-07-26] change | Made retention actions discoverable and measurable
Added a due-review badge to Practice Tests and made the daily-goal card recommend the next eligible solve, review, or practice action. Added a content-free GA4 contract for returns, activity, mistake capture, review entry/outcomes/completion/removal, and goal completion, plus a documented dashboard funnel. Desktop browser QA covered previous-day return, solve→review recommendation, queue completion, event payloads, and streak rollover; mobile QA found no horizontal overflow; a live temporary Email/Password session confirmed guest progress moved into UID-scoped storage and was deleted afterward.

## [2026-07-26] change | Collapsed the daily goal into an on-demand panel
Replaced the permanently expanded sidebar goal card with one 44px summary row showing goal progress. Activating the row opens the full progress, streak, and next-action content in an anchored overlay above it, so Sign in, Theme, and legal links keep their positions. The control exposes expanded state, supports Escape/outside-click dismissal, and passed desktop plus 390px mobile layout checks without horizontal overflow.

## [2026-07-26] change | Added the Pressroom-powered blog
Added server-rendered `/blog` pagination and `/blog/[slug]` articles using the server-only Pressroom key with five-minute revalidation. The release includes conditional covers/tags/authors, rich-content styles, metadata, Blog/BlogPosting JSON-LD, empty/error states, sidebar/footer navigation, and live article sitemap entries. The real API authenticated but returned zero live posts; a local Pressroom fixture passed list/article metadata, rich tables/highlights/tasks, author, CTA, sitemap, and 390px mobile layout checks. Production must receive `PRESSROOM_API_KEY` at runtime; the ignored local key was never committed or exposed to the browser.

## [2026-07-26] change | Moved Blog out of primary navigation
Moved the Blog link from the sidebar's primary navigation to its compact bottom link group beside Privacy Policy and Terms of Service, keeping learning and solver actions prominent.

## [2026-07-26] change | Hardened Cloud Run deployment configuration
Replaced the secret-bearing local deployment helper with a tracked, env-driven Cloud Run deployment script. It loads Firebase's six public build-time values from ignored local configuration, sends them through the Cloud Build environment, and updates runtime values—including the server-only Pressroom key—without committing them.

## [2026-07-26] change | Passed Firebase config into production Docker builds
Replaced Cloud Run source-build environment flags with an explicit Cloud Build Docker step that supplies all six Firebase public values as Docker build arguments. Deployments now push a commit-tagged Artifact Registry image and deploy that image while preserving server runtime configuration.

## [2026-07-26] change | Deployed Firebase-enabled production release
Deployed Artifact Registry image tag `09f5dbb` as Cloud Run revision `mathsolver-00014-g5n` with 100% traffic. Verified Firebase public configuration in the canonical-domain browser bundle and HTTP 200 responses for the homepage, blog, branded auth action, practice library, and sitemap.

## [2026-07-26] lint | Corrected MathGPT video infrastructure prerequisites
Verified that Firebase Authentication and live verified-owner Firestore persistence already provide MathSolver's account and database foundation. Corrected [[mathgpt-video-research]] to reuse Firebase identity and Firestore for video quota/job state; the remaining additions are server-side token verification and atomic quota enforcement, an asynchronous render queue/worker, and private video storage/delivery.

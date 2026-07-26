# Tech & Ops

Stack, hosting, config, and the sharp edges. File locations: [[codebase-map]]. Product features: [[product-overview]]. Index: [[index]].

## Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2, React Compiler (`babel-plugin-react-compiler`), TypeScript.
- **Styling:** Tailwind CSS v4, `@tailwindcss/typography`, `framer-motion`, `lucide-react`, `next-themes`.
- **Math:** KaTeX + `react-markdown` + `remark-math` + `rehype-katex`; `mathlive` for input; `react-resizable-panels` for split view.
- **Build/host:** Docker (`Dockerfile`, Next `output: "standalone"`) → **Google Cloud Run** (`deploy.sh`; project `axial-willow-428621-n4`, `us-central1`, 4Gi/2CPU, max 20 instances).

## External services / models

| Purpose | Provider | Where |
|---|---|---|
| Solve + practice generation | Google **Gemini 3.1 flash-lite** (solve temp 0.2, max 2000 output tokens) | `/api/solve`, `/api/practice`, `/api/practice/steps`, `src/lib/gemini.ts` |
| OCR (image/PDF/drawing → text) | Google **Gemini 3.1 flash-lite** (`gemini-3.1-flash-lite`, `generativelanguage.googleapis.com/v1beta`) | `/api/ocr` |
| Optional account + notebook sync | Google **Firebase Authentication + Cloud Firestore** | `AuthContext`, `ChatContext`, `firebase-client.ts`, `firebase-notebook.ts` |

| Bot protection | Cloudflare Turnstile | `src/lib/captcha.ts`, `TurnstileProvider.tsx` |
| Analytics | Google Analytics 4 (`G-YG1NPYM8BS`) | `src/app/layout.tsx` + privacy-safe event adapter in `src/lib/analytics.ts` |

## Env vars / secrets

Referenced: server-only `GOOGLE_CLOUD_API_KEY`; optional `GEMINI_MODEL` override (default `gemini-3.1-flash-lite`); and Turnstile site + secret keys. Legacy Azure values may remain in owner-side deployment configuration but are no longer read by the application.

Optional Firebase Web app values: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`. These public identifiers are listed in `.env.example`; they are not service-account credentials. Next embeds them at build time, so Docker/Cloud Build must pass them as build arguments rather than only setting Cloud Run runtime env vars.

⚠️ **Security debt (fix before scaling traffic):** `deploy.sh` has these as **plaintext, committed** values. They should be **rotated** and moved to Cloud Run secret management / Secret Manager. Never print, echo, or commit these. Do not add new secrets to tracked files.

## Persistence

Persistence is local-first. Signed-out data uses browser `localStorage` key `mathsolver_chats`. Signed-in account caches use `mathsolver_chats_user_{uid}`. Email/Password users can keep solving locally while verification is pending, but neither the client nor the checked-in rules permit cloud notebook access until `email_verified` is true. Google users arrive verified. A verified sign-in merges guest, account-cache, and Firestore chat versions by chat ID/latest `updatedAt`, imports the guest notebook, then debounces writes until streaming finishes. Firestore documents live at `/users/{uid}/chats/{chatId}` and checked-in rules restrict all access to the matching verified UID. Deletes also write `/users/{uid}/chatDeletions/{chatId}` tombstones, preventing an older device cache from resurrecting a removed chat.

Chat text, OCR text, generated tests, generated explanations, per-question mistake-review schedules, and up to 20 recent completion attempts per test sync. Review state is nested on the existing question (`dueAt`, interval, review count, lapses, last review), so there is no duplicated question text or separate Firestore collection. Original uploaded image data URLs remain browser-local: cloud serialization retains their OCR text but removes the binary data to stay below Firestore's 1 MiB document limit. Chats are capped at 200 messages by rules; a future long-notebook design should move messages into subcollections before raising that limit.

Daily goal/streak state is a smaller device-local layer managed by `LearningProgressContext`, not Firestore. Guests use `mathsolver_learning_progress_v1`; signed-in browsers use `mathsolver_learning_progress_user_{uid}` and merge/remove guest progress at sign-in. Only boolean daily activity categories are retained (maximum 90 dates), with no problem content or identity data. Local calendar dates define day boundaries. This account-scoped cache does not yet provide cross-device streak sync.

## Analytics contract

`src/lib/analytics.ts` queues GA4 events even if `gtag.js` is still loading. The retention contract is intentionally narrow:

| Event | Parameters |
|---|---|
| `learning_return` | `days_away`: `1`, `2_7`, `8_30`, or `31_plus` |
| `learning_activity` | `activity`: `solve`, `practice`, or `review` |
| `daily_goal_action_clicked` | `action`: `solve`, `practice`, or `review` |
| `daily_goal_completed` | `completing_activity`, `streak_days` |
| `mistake_saved` | none |
| `review_queue_started` | `question_count` (max 5), `source` |
| `review_answered` | `outcome`, `attempt_number`, `next_interval_days` |
| `review_queue_completed` | `question_count`, `reviewed_count`, `first_try_correct` |
| `review_item_removed` | none |

Never add problem text, options/answers, OCR/image data, email/profile values, Firebase IDs, chat IDs, or question IDs. `learning_return` fires at most once per local date/session when an earlier local activity date exists. The practical funnel and scorecards live in [[growth-strategy]].

**Project architecture confirmed 2026-07-26:** `axial-willow-428621-n4` remains the Cloud Run build/hosting project in `us-central1`; `math-solver-e3a55` is the separate Firebase Authentication and Firestore data project. The latter owns the Admin SDK identity and registered Web app, with Email/Password and Google Auth enabled. `.firebaserc` defaults Firebase-only operations to `math-solver-e3a55` and retains a non-default alias for the Cloud Run project. Storage and billing-dependent image sync remain out of scope.

**Live setup status:** the ignored local Web config matches the registered Firebase Web app; `math-solver.io` is authorized; Email/Password and Google providers are enabled; and the Email/Password create, sign-in, verification-email request, reset-email request, and cleanup paths passed temporary live tests. Interactive Google OAuth was not automated because no user Google session was supplied. Firestore's `(default)` Native database is active in existing multi-region `nam5` (preserve it). The owner published the checked-in rules; live verified-owner chat and tombstone create/read/update/delete pass, while anonymous, cross-user, unverified, and malformed operations are denied.

**Custom email action handler:** `/auth/action` handles `verifyEmail`, `resetPassword`, and `recoverEmail` codes inside the MathSolver UI. It accepts only same-origin continue URLs and feeds successful verification/reset state back to `AuthContext`. Firebase controls the email's initial destination in Authentication → Templates, not through the client `ActionCodeSettings.url` (that value is only `continueUrl`). After the route reaches production, set the customized action URL for **Email address verification** and **Password reset** to `https://math-solver.io/auth/action`; use the same URL for email-change/recovery if that flow is enabled. `math-solver.io` must remain authorized. This web-only flow needs neither Firebase Hosting nor `linkDomain`, and keeps `handleCodeInApp: false`.

## SEO infrastructure (current)

- Sitemap contains `/`, legal pages, `/calculator`, and all 43 calculator registry routes, for 47 URLs total. Calculator `lastModified` uses the stable 2026-07-24 release date rather than changing on every request.
- `robots.ts` allows all, disallows `/api/`, base `https://math-solver.io`.
- Root `WebSite` + `Organization` JSON-LD lives in `layout.tsx`. Calculator pages add self-canonicals, unique metadata, topic OG/Twitter cards, `WebPage`, `BreadcrumbList`, and `WebApplication` JSON-LD. Visible FAQs do not use retired FAQ schema.
- `src/lib/calculators.ts` combines definitions from the Algebra, Calculus, Linear Algebra, Trigonometry, Statistics, General Math/Precalculus, and Graphing modules. The registry drives static generation, the sitemap, related links, metadata, tool selection, and generated OG cards, and validates integrity when imported. See [[calculator-pages]].
- The graphing calculator has no external plotting dependency. `src/lib/math-expression.ts` safely parses supported explicit expressions, and `GraphingCalculator.tsx` renders them to canvas in the browser.
- The homepage has priority calculator links in `SeoSections.tsx`, and the sidebar links to the calculator hub.
- No blog, no i18n (`<html lang="en">` hardcoded).
- **Current release:** the user confirmed that the 43-calculator, 47-URL release was deployed on 2026-07-24. A local code change made after that confirmation makes the shared desktop/mobile logo link to `/`; deploy that follow-up for it to reach production.

## Known gotchas & stubs (as of 2026-07)

- **Repo-wide ESLint debt** — the calculator launch files lint clean and the production build passes, but a full `eslint .` still reports 21 errors and 12 warnings in pre-existing legal-page copy, refs/effects, MathLive typings, practice state, and Turnstile code.
- **Dead footer links** — "Blog", "Careers", "Contact" are `href="#"` in `EmptyState.tsx`.
- **Edit-message button** — pencil icon on user messages in `MessageList.tsx` has no `onClick` (stub).
- **`isCorrect` badge** — supported in the `Message` type / `MessageList` but never set anywhere.
- **Rate limiter is in-memory per instance** (`captcha.ts`, 60/hr) — won't hold globally across Cloud Run's up-to-20 instances. Needs a distributed store at scale.
- **`DraggableCalculator` uses `new Function()`** to eval expressions — arithmetic only, but arbitrary-eval-flavored; keep inputs constrained.
- **Firebase email templates still need the custom action URL.** Until the new route is deployed and the verification/reset templates point to `https://math-solver.io/auth/action`, Firebase's hosted action widget remains the first page opened from emails.
- **No Firebase Storage/image sync.** Image previews remain on the originating browser; OCR text makes the synced conversation usable.
- **Daily streaks are not cross-device.** Mistake schedules sync inside verified notebooks, but the lightweight daily activity/streak record remains in the current browser's UID-scoped local storage.

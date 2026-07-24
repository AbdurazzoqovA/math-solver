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
| Solve + practice generation | Azure OpenAI **GPT-4o** (temp 0.2, max_tokens 2000) | `/api/solve`, `/api/practice`, `/api/practice/steps` |
| OCR (image/PDF/drawing → text) | Google **Gemini 3.1 flash-lite** (`gemini-3.1-flash-lite`, `generativelanguage.googleapis.com/v1beta`) | `/api/ocr` |

> Azure detail: the routes fetch `AZURE_OPENAI_ENDPOINT` **as-is** — the deployment name and api-version are encoded in that env-var URL, not hardcoded in the source. So the exact deployment/api-version depends on the deployed env value (GPT-4o per current config); don't assume specific values from the code.
| Bot protection | Cloudflare Turnstile | `src/lib/captcha.ts`, `TurnstileProvider.tsx` |
| Analytics | Google Analytics 4 (`G-YG1NPYM8BS`) | `src/app/layout.tsx` — pageviews only, no event tracking |

## Env vars / secrets

Referenced: `AZURE_OPENAI_ENDPOINT`, Azure OpenAI key, Google Cloud/Gemini API key, Turnstile site + secret keys.

⚠️ **Security debt (fix before scaling traffic):** `deploy.sh` has these as **plaintext, committed** values. They should be **rotated** and moved to Cloud Run secret management / Secret Manager. Never print, echo, or commit these. Do not add new secrets to tracked files.

## Persistence

**None server-side.** All user data (chats, messages, uploaded image data-URLs, generated practice tests) is serialized to browser `localStorage` under key `mathsolver_chats` in `ChatContext.tsx`. A cleared cache = total data loss. Any feature needing durable/cross-device data requires new backend infrastructure (flag it explicitly).

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

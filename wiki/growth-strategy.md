# Growth Strategy

Full, self-contained growth plan for MathSolver — SEO + retention. Distilled from July 2026 market research and the codebase audit. Visual version (for sharing): https://claude.ai/code/artifact/472a8bcd-7183-44a8-8ab7-c7e23babe8a0 — but **this page is the source of truth; it contains everything the artifact does.**

Context pages: [[product-overview]] (what exists today), [[tech-and-ops]] (stubs & gaps to fix), [[index]].

---

## Thesis

The market timing is exceptional. **Microsoft Math Solver retired (July 2025)**, **Photomath still has no web version**, and **Chegg/Course Hero** (owners of Mathway & Symbolab) are collapsing under AI-search traffic loss. Every remaining leader **paywalls the step-by-step explanations** — the #1 student complaint everywhere. MathSolver gives full steps free.

The full first-wave taxonomy of 43 calculator pages across eight categories shipped on 2026-07-24, expanding the sitemap from 3 URLs to a 47-URL indexed surface. It includes a real interactive graphing tool and 42 focused tutor configurations. The remaining caps are authority and retention: the site now needs indexing feedback, comparison pages, and reasons to return more than another batch of near-duplicate calculator routes. **Measure the calculator surface, build the alternative cluster, then build retention.** Interactive tools resist Google's AI Overviews, so weight investment toward tools + practice, not answer-dump content. See [[calculator-pages]].

---

## Competitor landscape (July 2026)

| Tool | Free tier | Paywalled | SEO engine | Our opening |
|---|---|---|---|---|
| **Symbolab** (Course Hero) | Answers only, few queries | Step-by-step, $9.95/mo | Thousands of `/solver/{topic}-calculator` pages | Copy the page model, undercut the paywall |
| **Mathway** (Chegg) | Answers with ads | All steps, $9.99/mo | Subject pages + indexed "Popular Problems" | Parent in collapse; free steps beat them |
| **Photomath** (Google) | App free | Deeper explanations (Plus) | **None — app-only, no web version** | "Photomath online" searches hit thin clones |
| **MS Math Solver** | **Retired July 2025** | — | Huge localized pages, now orphaned | Its keyword footprint is unclaimed |
| **Wolfram Alpha** | 50–100 queries | Full steps, Pro from $5/mo | Brand + query-page authority | Terse steps, intimidating input — learners bounce |
| **Gauth** (ByteDance) | Daily question caps | Unlimited, ~$11.99/mo | Programmatic answer pages (#1 in category) | Accuracy complaints; caps push users out |
| **MathGPT** | Limited freemium | Unlimited, $9.99/mo | Comparison / "vs ChatGPT" content | Beatable on price (we're fully free) |
| **Quizlet** | Capped study modes | Learn mode + practice tests, $35.99/yr | 65M visits from user-generated sets | Paywall backlash — our practice tests are free |
| **Khan Academy** | Everything core | Khanmigo AI tutor | Authority course content | Complementary — don't fight head terms |

---

## The 10 gaps (green = asset we already hold, amber = needs building)

1. **🟢 Full steps, free, unlimited** — the loudest complaint about every leader. Already true; state it everywhere, permanently.
2. **🟢 "Photomath online" vacuum** — Photomath has no web presence; clones rank for its web intent. We have real OCR — needs a landing-page cluster.
3. **🟠 Microsoft Math Solver orphaned demand** — only fully-free big brand, now gone. Build one alternative page to claim it.
4. **🟢 Quizlet paywall refugees** — Learn mode + practice tests newly paywalled; our practice tests are free. Market to this churn.
5. **🟢 Explanations that teach, not just steps** — competitor steps are terse/robotic. Free "explain this step / why?" follow-up is our chat's native strength.
6. **🟢 Word problems** — classic symbolic engines (Symbolab/Mathway) are weak here; it's an LLM strength. Winnable cluster.
7. **🟠 Accuracy trust** — wrong answers are the top reason students abandon AI solvers. Add a verification pass / "checked" badge.
8. **🟢 No signup, no caps** — rivals cap queries/questions. "Unlimited, no sign-up" converts comparison traffic. Already true — headline it.
9. **🟢 Draw-to-solve on web** — almost unique; canvas shipped but unmarketed. Target iPad/tablet students with its own page.
10. **🟠 Incumbents are wounded now** — Chegg traffic ~−49% YoY, layoffs, suing Google over AI Overviews. Move fast; this window closes.

---

## SEO plan — ranked plays

### Play 1 (highest ROI): Programmatic calculator pages
One page per solver intent at `/calculator/{topic}`. Each page: the solver **pre-configured for that topic** on top, then a formula explainer, worked examples, common mistakes, visible FAQs, and related tools. FAQ schema is intentionally omitted because Google retired FAQ rich results in May 2026. Every page reuses the existing chat solver, so **no new solving tech is needed**.

**Shipped 2026-07-24:** all 43 routes below plus `/calculator`, sitemap coverage, unique metadata/canonicals/keywords, structured data, generated OG cards, homepage/sidebar links, server-trusted topic instructions, and topic-to-topic internal links. Graphing is an interactive client-side plotter with a shared-chat explanation handoff. Keyword boundaries and architecture: [[calculator-pages]].

**Which pages to build (start with the ~30 highest-volume, then expand toward the full taxonomy):**

- **Algebra (shipped):** `/calculator/solve-for-x`, `/quadratic-equation`, `/simplify`, `/factoring`, `/systems-of-equations`, `/inequalities`, `/exponents`, `/logarithms`, `/polynomial`, `/rational-expressions`, `/complete-the-square`, `/slope`, `/distance-formula`
- **Precalculus (shipped):** `/calculator/inverse-function`, `/function-composition`, `/domain-range`
- **Calculus (shipped):** `/calculator/derivative`, `/integral`, `/definite-integral`, `/limit`, `/partial-derivative`, `/implicit-differentiation`, `/taylor-series`, `/series-convergence`
- **Linear algebra (shipped):** `/calculator/matrix`, `/determinant`, `/matrix-inverse`, `/eigenvalue`, `/dot-product`, `/cross-product`
- **Trigonometry (shipped):** `/calculator/trig-identities`, `/unit-circle`, `/law-of-cosines`
- **Statistics (shipped):** `/calculator/standard-deviation`, `/mean-median-mode`, `/probability`, `/permutation-combination`, `/z-score`
- **General Math (shipped):** `/calculator/fraction`, `/percentage`, `/gcd-lcm`, `/word-problems`
- **Graphing (shipped):** `/calculator/graphing`. This is a real visualization tool that evaluates explicit functions locally and draws them to canvas. It is different from the drawing canvas, which captures handwritten input for OCR.

### Play 2: Alternative & comparison pages
Search intent matches our exact differentiator (free steps, no caps, in-browser). Newcomers rank fast because incumbents can't write "alternatives to us."
- `/photomath-online`, `/symbolab-alternative`, `/mathway-alternative`, `/microsoft-math-solver-alternative`, `/wolfram-alpha-alternative`, `/gauth-alternative`
- Comparison: `/photomath-vs-mathway`, `/free-math-solver-with-steps`

### Play 3: Worked-example problem library
Indexed pages of solved problems grouped by topic, seeded from anonymized real user queries — the model behind Mathway "Popular Problems" and Gauth's #1 category ranking. **Requires quality thresholds, dedup, and canonical discipline** to avoid thin-content penalties. Start after calculator pages prove out.

### Play 4: Topic explainers feeding the calculators
"How to find the derivative of ln(x)", "chain rule with examples" — each interlinked with its matching calculator page. Target low-competition long-tail first. The Pressroom-backed `/blog` index, article template, navigation, metadata, and dynamic sitemap integration shipped in code on 2026-07-26; the feed had zero live posts at validation, so publishing the first focused explainer cluster is now the content blocker rather than engineering.

### Play 5: Exam-track hubs
Free Digital SAT / ACT / AP Calc / GCSE practice pages. Khan owns head terms, but long-tail ("AP Calc AB unit 3 practice problems") is open. Feeds the retention loop.

### Play 6 (later): Localization
Microsoft Math Solver's superpower was heavy localization; that multilingual demand is now unserved. Revisit once the English network ranks.

---

## Retention plan — ranked (evidence-backed)

Homework traffic is transactional — converting it needs a **forward-looking goal** (streak, exam date, mastery %). Duolingo: 55% return next day to keep a streak; streaks cut churn 47%→28% and drove ~4.5× DAU.

1. **Streaks + daily goal (shipped in code 2026-07-26)** — a deliberately lightweight, local-first two-activity goal now counts distinct solves, completed practice, and completed reviews. It works before signup, uses account-scoped browser storage after Firebase sign-in, merges guest progress, and stays quiet/non-punitive in the sidebar. The card recommends the next eligible action, and the Practice Tests navigation shows a due-review badge.
2. **Lightweight accounts + synced notebook** — the optional Google or verified Email/Password journey and private Firestore chat/practice sync foundation are implemented as of 2026-07-26, preserving the no-login path. Live verified-owner/isolation tests pass; course folders remain unbuilt.
3. **Daily mistake-review queue (shipped in code 2026-07-26)** — first-attempt misses now persist on the existing saved question and feed a one-tap queue of up to five due problems. Correct reviews use 1→3→7→14-day intervals; misses reset to one day. The learner can remove a bad AI-generated item, and verified notebook sync carries review state with its source practice test.
4. **Exam-prep tracks (SAT/ACT/AP/GCSE)** — external deadline → multi-month daily use. Pairs with exam-hub SEO pages.
5. **PWA + streak-reminder push** — installable; prompt install right after a solved problem, never on load (iOS needs home-screen install first).
6. **One-tap follow-ups on every solution (shipped 2026-07-26)** — the latest completed solution offers one scalable numbered-step picker plus "similar problem" and "quiz me" actions. The first two reuse contextual chat; the third reuses saved/generated practice. This targets the strategy's 3+ interactions-per-session goal without a new model or API.
7. **Mastery dashboard + weekly email** — per-topic progress ("Quadratics: mastered — next: factoring").
- **Skipped:** community/leaderboards — Brainly owns peer Q&A (350M MAU); expensive to bootstrap. Revisit only at large scale.

---

## Roadmap

**Now (wks 1–4):** the first 43 calculator pages, graphing tool, core 47-URL sitemap, Pressroom blog surface, persisted practice scores, one-tap solution follow-ups, production-ready auth journey, mistake review, and daily goal/streak are shipped in code. Firebase Auth/Web app/domain setup is complete; Firestore exists in `nam5`; verified-owner CRUD and isolation tests pass live. Privacy-conscious retention events now cover return, first mistake saved, review entry/outcome/completion/removal, distinct learning activity, daily-goal actions, and daily-goal completion without sending math content or identity fields. Next: deploy the custom email-action/blog release and provide `PRESSROOM_API_KEY` to Cloud Run; publish the first Pressroom topic explainers; submit and inspect calculator/blog URLs in Search Console; ship 4–6 alternative/comparison pages; then inspect the retention funnel before investing in mastery or reminders.

**Next (mo 1–3):** use review/streak behavior to decide whether cross-device progress sync and topic-level mastery are justified; add course folders; build the quality-gated worked-example library; grow the Pressroom feed into interlinked topic clusters; add a PWA install prompt after successful solves; replace the in-memory rate limiter.

**Later (mo 3–6+):** exam-prep tracks with progress; mastery dashboard + weekly email; push notifications (timed to evening homework hours); answer-verification / "checked" badge; localization of top calculator pages.

---

## Metrics to watch

- **Clicks by page-type** (Search Console, filter by URL pattern) — calculator pages should show impressions within 2–4 weeks of indexing, clicks by week 6–8.
- **Returning-visitor rate** (GA4) — near-zero today; streaks + notebook should push 7-day return above 20%.
- **Solves per session** — ~1 today; follow-up buttons + practice prompts should push toward 3+.
- **Practice completion** — share of solutions that become a started (and finished) practice test.
- **Accuracy complaints** per 1,000 solves — one wrong answer at homework crunch is a permanent churn event.
- **Seasonality** — edtech peaks Sept/Jan/March, troughs in summer. The May→July 2026 growth happened in the trough, so September should amplify it. Plan exam-season pushes (May AP/finals, SAT dates) as re-activation moments.

### Retention dashboard after release

Use one GA4 exploration funnel: `learning_return` → `review_queue_started` → `review_queue_completed` → `daily_goal_completed`. Segment by `days_away` and review `source`, then keep four scorecards beside it: returned learners, review start→completion rate, first-try review accuracy (`first_try_correct / reviewed_count`), and daily-goal completion count. Treat `review_item_removed / mistake_saved` as the AI-question quality warning. Do not add problem text, answers, emails, Firebase IDs, chat/question IDs, or images as analytics parameters.

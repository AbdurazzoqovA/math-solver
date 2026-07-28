# Mobile App Concept — MathSolver for iOS & Android

Product concept and plan for the MathSolver mobile app, distilled from four live-web research passes run 2026-07-27 (competitor teardown, user-sentiment mining, AI-capability scan, market/distribution analysis). This is a **plan, not an implementation spec** — no code exists yet. Context: [[growth-strategy]] (web strategy this extends), [[mathgpt-video-research]] (the video engine launching 2026-07-28), [[product-overview]] (what exists today), [[tech-and-ops]] (backend that mobile reuses).

---

## TL;DR

Build a **camera-first AI math tutor** whose signature is the thing launching on web tomorrow: **per-problem generated animated video explanations**. Keep the brand pledge — *full step-by-step solutions free, unlimited, forever* — and monetize depth (unlimited videos, exam prep, live voice tutor), not answers. The market window is real and ~12–24 months wide: Photomath is feature-frozen inside Google, Mathway/Symbolab are in managed decline under collapsing parents, Microsoft exited, and the aggressive entrants (Gauth, Question.AI) are ByteDance/Zuoyebang answer-machines with 2.1★ Trustpilot billing reputations. Only one small player (MathGPT, ~2M users) sells generated video today. The app must NOT be a port of the web chat UI — it is a different product built around the camera, short vertical video, and a daily practice loop.

---

## 1. Why mobile, why now

- **Students live on phones; homework help is camera-shaped.** Gauth hit #1 in US education downloads (1.39M peak DAU, downloads +21× YoY) on pure snap-and-solve ([FoxData](https://foxdata.com/en/blogs/bytedances-gauth-ai-study-companion-dominates-2025-us-education-charts-as-top-ai-homework-helper/)). Photomath has 300M+ lifetime installs with no web version. The web product cannot reach this behavior; app-first rivals can't match our web SEO. We can hold both.
- **The incumbents are wounded simultaneously.** Chegg (Mathway): revenue −48% YoY, 45% layoffs, running Academic Services "for cash flow" ([CNBC](https://www.cnbc.com/2025/10/27/chegg-slashes-45percent-of-workforce-blames-new-realities-of-ai.html), [Business Wire](https://www.businesswire.com/news/home/20260209620934/en/Chegg-Reports-2025-Fourth-Quarter-and-Full-Year-Financial-Results)). Photomath: maintained but feature-frozen since the Google acquisition — no chat, no voice, no generated video ([9to5Google](https://9to5google.com/2024/02/29/photomath-google-app/)). Microsoft Math Solver retired July 2025. Symbolab idles under Learneo.
- **The real ceiling is free chatbots, and it's beatable on math-native UX.** ChatGPT Study Mode (free, July 2025), Gemini Guided Learning + free Gemini Live camera tutoring set the $0 baseline ([OpenAI](https://openai.com/index/chatgpt-study-mode/), [blog.google](https://blog.google/products/gemini/guided-learning-google-gemini/)). They are generalists: clumsy math input, no verified answers, no curriculum practice loop, no narrated video. "ChatGPT for everything, MathSolver for math" is the winnable slot.
- **Our video launch is genuinely early.** No incumbent at scale ships per-problem generated narrated video (Photomath's tutorials are canned; Gauth's whiteboard is ephemeral; OpenAI/Google chose *interactive* visuals over narrated video). The only direct competitor is MathGPT (~2M users, 5 free videos/day, $9.99/mo unlimited) ([math-gpt.org](https://math-gpt.org/)). Expect fast-follow within quarters — the window is now.
- **Seasonality dictates the calendar.** Student AI usage collapses in summer and snaps back in September (+21% student traffic) with a second spike in April–May exam season ([Sherwood](https://sherwood.news/tech/chatgpt-use-is-picking-up-again-just-as-students-head-back-to-school/)). September 2026 is too close to ship a great app; catch it on web, ship the app into the fall, be polished by January and dominant by May.

## 2. Research digest

### Competitive field (July 2026)

| App | Owner | Free tier | Paid | Weakness to exploit |
|---|---|---|---|---|
| Photomath | Google | Unlimited scans, basic steps | Plus $9.99/mo / $69.99/yr | Feature-frozen; steps-depth paywalled; no chat/voice/video |
| Gauth | ByteDance | ~11 solves/day + ads | $11.99/mo; tutors +$19.99/mo | 2.1★ Trustpilot; trial auto-charge traps; ban-law overhang |
| Mathway | Chegg | Answers only + 30s forced ads | $9.99/mo / $39.99/yr | Harshest free tier; parent collapsing |
| Symbolab | Learneo | Limited steps, ads | ~$6.99/mo (SKUs vary wildly) | Dated UX; paywalled steps; neglected |
| Question.AI | Zuoyebang | Generous but ad-saturated | ~$8.99/mo | Ads after every action; accuracy; China-data optics |
| MathGPT | independent | 15 solves + **5 videos**/day | $9.99/mo ($6.99/mo annual) | Small brand; the only direct video rival |
| Khanmigo | Khan Academy | — (teachers free) | $4/mo | No camera solver; refuses answers, students bounce |
| ChatGPT / Gemini | OpenAI / Google | Study Mode / Guided Learning free; live camera+voice | $20 / $19.99 AI Pro | Generalist: no verified math, weak input UX, no practice loop, integrity optics |

### What users actually say (2025–26 review/forum mining)

Top pains, ranked: **(1)** steps paywalled at the moment of confusion — the category's defining complaint; **(2)** subscription dark patterns (Gauth $323 billing-loop horror stories; FTC fined Chegg $7.5M over cancellation traps — [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/09/ed-tech-provider-chegg-pay-75-million-settle-ftc-allegations-concerning-unlawful-cancellation)); **(3)** confident wrong answers causing real zeros (Gauth failing geometry finals); **(4)** ad saturation; **(5)** camera/OCR failures on handwriting, diagrams, multi-part problems; **(6)** topic gaps — word problems, geometry with figures, proofs; **(7)** answers without understanding; **(8)** rigged-feeling quota/credit systems; **(9)** trust gap + getting-caught anxiety; **(10)** privacy (ByteDance/Zuoyebang scrutiny).

Top wishes: free steps; verified accuracy ("run it through two AIs" is literal Reddit advice); a learning mode that doesn't spoil the answer; adjustable explanation depth; **animated/voice video explanations** (the most-praised premium feature in the category); robust handwriting/diagram capture; **"check MY handwritten work and find my mistake"** (highest-value unowned feature); follow-up chat; exam-prep loops; teacher-accepted solution formats; offline/school-network use.

Learning-science backing: a PNAS RCT shows raw answer-engines *hurt* exam performance while hint-first tutors keep the gains ([PNAS](https://www.pnas.org/doi/10.1073/pnas.2422633122)); Harvard's AI tutor doubled learning vs active classes; passive video alone doesn't transfer — pair video with immediate practice ([PNAS study](https://www.pnas.org/doi/10.1073/pnas.2213430120)). Hints-first default + one honest "show answer" tap is both the ethical and the commercial design.

### What 2026 technology allows

- **Math accuracy is a pipeline property now.** Frontier models saturate competition math (first perfect IMO 42/42 scores, July 2026 — [SCMP](https://www.scmp.com/tech/article/3361482/worlds-first-ai-model-earn-perfect-score-maths-olympiad-comes-chinas-rednote)); residual risk concentrates in cheap fast tiers (our current flash-lite class), un-tooled arithmetic, and OCR misreads. Production answer: cheap solve → symbolic/code-execution check → escalate to reasoning model on disagreement → visible "Verified" badge. A verify pass adds ~$0.01–0.05/solve only when triggered.
- **Live voice+camera tutoring is commodity-priced:** Gemini Live class APIs run ≈ $0.01–0.03/min ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)). The capability is free in Gemini; the differentiator is a math-native session (our solver/verifier as tools, whiteboard sync, recap video afterward).
- **Our video COGS is ~$0.02–0.15 per 60s** (storyboard LLM + deterministic render + TTS) — 5–10 free videos/day per user is financeable with caching and rewarded ads; generative diffusion video stays irrelevant for equation-accurate steps.
- **On-device (phase 3):** Apple Foundation Models (iOS 26/27, provider-swappable), Gemini Nano/AICore, and Phi-4-mini-class models + an embedded CAS make an offline basic-solver tier realistic — zero COGS, privacy story, school-basement resilience.
- **Camera answers are an OS commodity on Android** (Circle to Search does homework steps free) — never market the viewfinder; market what happens after the scan.
- **Stack consensus for a small JS team:** Expo/React Native (New Architecture) + VisionCamera frame processors + RevenueCat; math rendered via server-side SVG/KaTeX cache (no first-class native KaTeX exists). Native Swift/Kotlin only where on-device AI demands it.

### Business benchmarks

Education is one of the best-converting app categories: median download→trial 7.1%, trial→paid ~30–45%, annual plans 59–66% of subscriptions; hard-ish paywalls with 7+ day trials outperform ([RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-education/)). AI apps churn ~30% faster than non-AI — retention loops are existential. Price anchors: $9.99/mo cluster (Photomath/Mathway/MathGPT/Brainly), $11.99 Gauth, $4 Khanmigo floor. US iOS CPI $1.5–3.5; Apple Ads median CPA ~$2.76 with the best D7 retention of paid channels.

## 3. Positioning

> **"The free math tutor that shows every step — and now shows you. Scan any problem, get verified steps free, and watch a video made just for your problem."**

- **The pledge (say it verbatim, everywhere, forever):** *Full step-by-step solutions. Free. Unlimited. No sign-up. No trial traps. Cancel Pro in one tap.* Every incumbent's worst reviews violate one of these; each clause is a conversion argument on comparison pages and the store listing.
- **Against incumbents:** they paywall understanding; we paywall *production value and volume* (video hours, live tutor minutes, exam packs) — never the explanation itself.
- **Against ChatGPT/Gemini:** camera-native, math-verified (no confident hallucinations, no answer roulette), animated visual steps, a real practice loop, works like a tool not a chat.
- **Tutor, not cheating tool:** Learning Mode is the default; hint-first; efficacy-research framing; an `/educators` page. This is also the district-filter and Texas-parental-consent survival posture.
- **Trust as architecture:** western hosting, COPPA-amended-clean, no contacts/location collection, parent-readable privacy page — the explicit anti-ByteDance/Zuoyebang position.
- Store identity: **"MathSolver: AI Math Tutor — Solver & Video Explanations"** (ASO covers "math solver," "steps," "video," "tutor").

## 4. Product concept — a tutor with a camera, not a calculator with AI

**North-star loop (every design decision serves it):**

```text
SCAN (camera, handwriting, voice, type)
  → VERIFIED STEPS (free, always, hint-first)
    → WATCH (60–90s animated video for THIS problem)
      → TRY (one similar problem immediately)
        → REVIEW (mistakes return on 1→3→7→14-day schedule)
```

The web app is chat-first; the mobile app is **loop-first**. Chat exists inside a solution, not as the home surface.

### The seven pillars

1. **Camera-first capture.** Opens to viewfinder (one-handed, sub-2s to shutter). Multi-problem page detection → tap the problem you want (worksheet mode solves them all). Handwriting and printed math, diagram-aware (geometry figures read into the problem context). Crop-adjust, flash, import from Photos/Files. Fallbacks: MathLive keyboard, draw-to-solve canvas (unique on web today, natural on touch), voice dictation. *Why: OCR failure is complaint #5 category-wide; capture quality is the first impression.*
2. **Verified steps, free, hint-first.** Streamed steps in the proven `**Step N:**` format. Learning Mode default: Hint → Next step → Full solution → *Show answer* (always one honest tap — no paternalism). Each step has "Why?" and "Explain simpler" (depth dial: ELI12 / standard / rigorous). **Verified badge** when the CAS/code-check pipeline confirms the answer; when checks disagree, show "double-checking with a stronger model…" — accuracy theater is honest here because it's real. *Why: pains #1, #3, #7; PNAS guardrail evidence; nobody at scale markets verification.*
3. **Watch — the signature.** Every solution offers "▶ Watch it explained" — the tomorrow-launch engine rendering this exact problem as a 60–90s animated, narrated, captioned video. Player is vertical-first with landscape zoom, scrubbing by step, 0.75–2× speed, captions on by default (classroom-silent viewing). Videos save to the notebook and cache offline. **Share card**: watermarked clip export ("solved & animated by MathSolver") — every share is an ad. *Why: the most-praised premium feature in the category, per-problem generation is nearly unowned, and problem-specific beats generic video pedagogically ([Frontiers 2025](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1509019/full)).*
4. **Check My Work.** Photograph *your own handwritten attempt*; the app finds the first wrong line, explains why it's wrong, and offers a micro-video of the fix. Ships as beta (multimodal models handle this today; polish is the moat). *Why: the highest-value unowned feature in every review corpus; the one camera feature teachers can endorse; converts "answer engine" into "tutor" structurally.*
5. **Ask & Live Tutor.** Free: follow-up chat on any solution (multi-turn, existing `/api/solve`). Pro, phase 2: **Live Tutor** — point the camera, talk; Gemini-Live-class voice+vision with a synchronized whiteboard, our solver/verifier wired in as tools; session ends with an auto-generated recap video (a combination nobody ships — Gauth has live whiteboard, no video; Google has live voice, no math verification, no recap). Metered in minutes. *Why: the one seat still open in math-native live tutoring.*
6. **Practice, mistakes, and a quiet streak.** Port the shipped web loop: 4-question quizzes per solution, first-miss → spaced review queue (1→3→7→14 days), due badges. Add mobile-only: daily 2-minute "Warm-up" (due reviews + one new problem), home-screen widgets (streak + daily problem), push timed to the user's homework hour (never content-bearing, privacy contract intact). Streak stays **quiet** (visible on the You tab, not shouted) — consistent with the owner's web UX decision in [[growth-strategy]]; revisit gamification volume with retention data. *Why: AI apps churn 30% faster; the loop is the moat; passive video doesn't transfer without practice.*
7. **Exam packs (phase 2–3).** SAT/ACT/AP Calc/GCSE tracks: countdown to the student's exam date, daily plan mixing new problems + due reviews, generated videos for every missed problem. *Why: exam dates create multi-month daily retention and align with the seasonal spikes; pairs with the web exam-hub SEO play.*

### Mobile-only surface (what the web can't do)

Camera as the primary input; offline notebook + cached videos; widgets; push; share-sheet ("share a photo *to* MathSolver from any app"); App Intents/Shortcuts ("Hey Siri, solve this"); iPad + Apple Pencil scratchpad with handwriting recognition (the vacated Microsoft/note-taking niche); later an on-device offline solver for basic algebra/arithmetic (zero COGS, works on school Wi-Fi dead zones, privacy story).

### What we deliberately do NOT build

- **Not a WebView/PWA wrapper of the web app** — the web UI is chat+sidebar, wrong grammar for mobile; only the backend is shared.
- No community/forum (Brainly owns it; moderation cost). No human-tutor marketplace v1 (Gauth's high-ARPU layer — revisit at scale). No general-subjects expansion (essay/code/chem) — "math only, done best" *is* the positioning vs generalist chatbots and wrapper apps. No behavioral-ad SDKs, ever (see §9). No AR page-overlay gimmick — stabilized viewfinder + fast results beats it; Android OS already commoditized live overlay.

## 5. UX architecture

**Four tabs:** **Solve** (camera home + input fallbacks + recent scans) · **Notebook** (chats/solutions/videos, search, folders later) · **Practice** (due reviews, quizzes, warm-up, exam packs later) · **You** (quiet streak, topic history, settings, manage subscription — cancellation path shown proudly).

**First-run:** 3 screens max (value → camera permission with visual rationale → age gate 13+) → straight into the camera; solve the first problem in <15 seconds from install. Account remains optional (guest = device-local, exactly like web); sign-in offered after first saved solution ("keep this on all your devices"), reusing Firebase Auth + Firestore merge from web. Paywall: soft Day-0 presentation after the *first video plays* (the aha moment), skippable; hard stops only at quota edges. Day-0 is where 89% of trials start — present, don't extort.

**Solve flow:** shutter → OCR readback strip ("Is this your problem?" — editable, catches misreads before wrong answers) → streamed steps (hint-first collapse) → action row: ▶ Watch · Check my work · Similar problem · Quiz me · Ask. Wrong-answer report button on every solution (feeds accuracy telemetry; "accuracy complaints per 1,000 solves" is already a north-star metric in [[growth-strategy]]).

**Video states:** generation is async (30–90s) — show storyboard scenes as they render (the HLS-live pattern from [[mathgpt-video-research]]); user can leave, push notifies on ready; queue position honest under load.

**Edge states designed, not defaulted:** unreadable scan (guided retake with framing tips), no network (offline notebook + cached videos + on-device tier later), quota reached (rewarded ad or Pro, phrased without hostility), verification failed (show the disagreement honestly, offer re-check with stronger model).

## 6. Technical plan (reuse-first; no code yet)

- **Client:** Expo/React Native, New Architecture, TypeScript shared with the Next.js monorepo types. `react-native-vision-camera` frame processors for capture; RevenueCat for StoreKit 2/Play Billing; math rendering via server-rendered KaTeX→SVG cache (avoid WebView-per-formula); HLS video via native players. Native modules only where needed (PencilKit, Foundation Models/AICore later).
- **Backend:** the existing Cloud Run APIs already speak plain HTTP/SSE — `/api/solve`, `/api/ocr`, `/api/practice`, and tomorrow's video pipeline serve the app as-is behind a versioned `/api/mobile/*` gateway. Required hardening (all pre-scale items already flagged in [[tech-and-ops]] / [[mathgpt-video-research]]): Firebase ID-token verification server-side, atomic Firestore quota transactions, distributed rate limiting (the in-memory limiter won't survive real mobile traffic), App Check/attestation instead of Turnstile for app clients.
- **Accuracy pipeline (new, shared with web):** flash-tier solve → SymPy/code-exec verification service → on disagreement escalate to a reasoning-tier model → only verified solutions render videos (protects both trust and render spend). This directly addresses the flash-lite-class wrong-answer risk the capability scan flagged.
- **Video:** same render farm as web; mobile adds push-on-ready, offline caching, and share-card export. Cache by normalized problem template — viral problems amortize to near-zero.
- **Cost envelope per active user/day (order of magnitude):** solve+verify $0.001–0.01 · 3 videos ≤$0.45 worst-case/≪ with caching · live tutor (Pro) ~$0.02/min. A $49.99/yr subscriber sustains >50% gross margin at realistic usage; free tier is financed by rewarded ads + conversion.

## 7. Monetization

- **Free forever:** unlimited scans, unlimited full steps, follow-up chat, practice + mistake review, notebook sync. (The pledge is inviolable — it is the brand.)
- **Video quota (the tunable lever):** 3 free videos/day; +1 per rewarded ad view (capped ~3/day — Gauth-proven pressure valve that keeps "free" honest); referral credits (+videos for invites — the share loop). MathGPT's 5/day free anchor says don't be stingier than ~3 + earnable.
- **Pro — $8.99/mo or $49.99/yr (annual-first framing "≈$4.17/mo"), 7-day trial:** unlimited videos (fair-use), priority rendering, Check-My-Work unlimited, exam packs, Live Tutor minutes (e.g. 60/mo then credit top-ups), offline video library. Undercuts Photomath ($69.99/yr), Gauth ($11.99/mo), MathGPT annual ($83.88/yr); sits above impulse-junk weekly pricing.
- **Anti-dark-pattern policy as marketing:** no card-up-front trial, pre-renewal reminder notification, one-tap cancel surfaced in settings, transparent regional pricing. The FTC-Chegg settlement made this compliance; we make it copy.
- **Dual billing rails:** StoreKit/Play IAP + Stripe web checkout via US external-purchase links (post-Epic ruling; commission question still in flux — keep both). Our web traffic makes web-first annual sales unusually viable.
- **Later:** teacher/classroom tier (hints-only mode + activity summaries — turns teachers from adversaries into a channel), human-tutor escalation credits, school licensing.
- **Target economics (checkpoints, not promises):** ≥6% download→trial, ≥35% trial→paid annual, ≈2–2.5% of installs paying → ~$1.1–1.3 revenue/install/yr against ≤$1.50 blended CPI (organic-heavy).

## 8. Go-to-market

- **Launch (fall 2026):** App Store featuring pitch (native camera + generated video is featuring-bait); Apple Ads on "math solver / photomath / mathway" (median CPA ~$2.76, best-retention paid channel); ASO on long-tail "math solver with steps free / video math solver"; comparison landing pages (`/photomath-alternative` etc., already in the web plan) funnel to installs; referral credits live from day one.
- **The Knowt maneuver, standing:** a competitor's paywall tightening or Gauth ban-law event is a distribution moment — keep switch-friendly onboarding ("import your problems, everything free here") ready to run within days.
- **Calendar:** ship v1 Oct–Nov 2026 → measure/iterate through January exam season (second traffic spike) → exam packs + Live Tutor polished for March–May AP/finals wave. Judge cohorts seasonally; never on summer data.

## 9. Trust, safety, compliance (design inputs, not afterthoughts)

- **Age & consent:** 13+ rating with Apple's new tiered questionnaire (declare AI-generated content honestly); Texas App Store Accountability Act is live (SCOTUS allowed enforcement July 2026) — under-18 installs include a parental-consent step we don't control, so the listing and privacy page must persuade a parent in 30 seconds.
- **COPPA (amended, fully in force since Apr 2026):** no behavioral ads to minors — contextual/rewarded only; voice input implicates biometrics rules — process-and-discard, never retain voiceprints; written retention limits; minimal PII (the existing no-content analytics contract in [[tech-and-ops]] extends to mobile unchanged).
- **Play policy (July 2026 round):** third-party AI integrations fall under user-data policy — disclosure + consent language for LLM vendors in the privacy page.
- **Academic integrity posture:** Learning Mode default, `/educators` page, efficacy-research citations, no "get answers fast" ad creative ever — this is what keeps us off district blocklists that killed Chegg-era brands, and it's structurally true because the product teaches.
- **Privacy as differentiation:** western data hosting, no contacts/location/photo-library scraping, parent-readable privacy summary — the explicit contrast with ByteDance/Zuoyebang scrutiny is procurement-grade trust.

## 10. Roadmap

| Phase | When | Scope |
|---|---|---|
| **0 — Runway (web)** | Aug–Sep 2026 | Video launch lands; backend hardening (token verify, quotas, distributed rate limit, App Check); accuracy-verification service v1 (benefits web immediately) |
| **1 — MVP (10–14 wks)** | ship Oct–Nov 2026 | Camera solve (single problem) + typed/draw input; verified hint-first steps; follow-up chat; video w/ quota + player + share cards; notebook incl. guest→Firebase sync; practice + mistake review; quiet streak + warm-up; paywall (RevenueCat, dual rails); push; iOS first, Android fast-follow |
| **2 — Differentiate** | Dec 2026–Feb 2027 | Check My Work out of beta; worksheet multi-problem mode; widgets; exam packs v1 (one exam, e.g. Digital SAT); Live Tutor beta (voice+camera+whiteboard+recap video); teacher page + classroom mode pilot |
| **3 — Moat** | Mar–Jun 2027 | Exam packs full (AP/ACT/GCSE) for May season; iPad + Pencil scratchpad; on-device offline solver tier; localization of top markets (the unserved Microsoft-Math-Solver demand); tutor-credit economy |

## 11. Metrics & kill criteria

Activation: install→first solved <60s median; install→first video ≥35%. Loop health: D1 ≥ 35%, D7 ≥ 15% (school weeks), solves/session ≥3, video→practice continuation ≥25%. Trust: wrong-answer reports <5/1,000 solves; verification-pass rate visible internally. Revenue: trial and paid checkpoints from §7; rewarded-ad fill for free-video top-ups. **Re-plan triggers:** D7 <8% after two school-month cohorts (loop is broken — stop adding features, fix retention); video watch-through <40% (format wrong); CPI-payback >12 months on paid channels (go organic-only).

## 12. Risks & falsifiable bets

1. **OpenAI/Google add TTS narration to their free interactive visuals** → our video moat narrows; counter: per-problem + curriculum practice loop + verified badge + speed; this is why Phase 1 cannot slip past fall.
2. **Google wakes Photomath up** (wires it into Gemini/Lens) — highest-impact incumbent move; no sign yet; monitor quarterly.
3. **Gauth ban/divestiture event** — upside risk; keep the switch-onboarding playbook warm.
4. **Video COGS blowout from abuse/virality** → quotas, caching by problem template, per-user cost ceilings (already designed in [[mathgpt-video-research]]).
5. **AI-churn gravity** (AI apps retain 30% worse) → the practice loop is the counter; if warm-up/streak data disappoints, invest in exam packs (deadline-driven retention) before gamification volume.
6. **Solo/small-team capacity** — the plan assumes backend reuse holds; if Phase 1 exceeds ~14 weeks, cut Android to later, cut worksheet mode, never cut verification or the video player polish.
7. **Store/regulatory shifts** (Texas-style laws spreading, Apple commission endgame) → dual billing + compliance-first architecture absorb most outcomes.

---

*Research provenance: four parallel live-web research passes, 2026-07-27 (competitor teardown; user sentiment; AI capability scan; market/monetization/distribution). Load-bearing sources linked inline; full reports in session transcript. Refresh the competitive table before Phase 1 scope-lock — this market moves quarterly.*

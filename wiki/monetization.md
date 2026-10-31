# Monetization

Pricing recommendation drafted 2026-10-31 at the owner's request and accepted the same day. Status: **live in production since 2026-10-31** with live Stripe keys, the registered webhook, and Telegram owner alerts; the release record is in [[azure-migration]]. Implementation details are in the "Implementation (2026-10-31)" section below; the ladder, economics, and revenue range are unchanged from the proposal. Market context and competitor prices come from [[growth-strategy]]; per-request costs from [[mathgpt-video-research]] and [[mobile-app-concept]]; entitlement storage from [[tech-and-ops]]. Index: [[index]].

## Inputs

- Traffic: ~3,000 visitors/day (~90k visits/month), top-3 Google ranking for "math solver".
- Moat: full step-by-step **typed** solving is free with no login, headlined across the homepage, 16 language homepages and 43 calculator pages. Every ranked competitor paywalls steps.
- Competitor paid prices: Symbolab $9.95/mo, Mathway $9.99/mo, Gauth ~$11.99/mo, MathGPT $14.99/mo, Wolfram Pro from $5/mo, Quizlet $35.99/yr.
- Unit cost (order of magnitude): text solve + verify $0.001–0.01; OCR similar; one video lesson $0.02–0.15. Video is the only material cost driver and is already metered per verified account in Firestore (`users/{uid}/entitlements/video`, 10/day).

## Principles

1. **Never paywall typed step-by-step solving.** It is the ranking and brand asset; gating it would hurt engagement signals on 1,000+ indexed pages and break the "free, no sign-up" promise.
2. Charge for the learning loop and for volume on costly features: videos, photo/drawing OCR, practice quizzes and review, cross-device notebook sync.
3. Undercut every competitor on the monthly price and make the yearly price the default on the pricing page.
4. Conversion happens at the gate moments (daily video/OCR/quiz limit reached), not on a `/pricing` page.

## Proposed ladder

| Plan | Monthly | Yearly | Effective /mo | What it unlocks |
|---|---|---|---|---|
| **Free** | $0 | — | — | Unlimited typed solves with full steps, no login; explain-a-step; print; photo/drawing OCR 5/day; 1 practice quiz/day; 2 video lessons/day (verified account) |
| **Plus** | $4.99 | $29.99 (save 50%) | $2.50 | Unlimited OCR; unlimited quizzes + mistake review; 10 videos/day; synced notebook; priority solver model; ad-free if ads are ever added |
| **Unlimited** | $9.99 | $59.99 (save 50%) | $5.00 | Everything in Plus; unlimited videos with a 30/day fair-use cap; video download; 90-day video retention (vs 14); early access to new features |

Optional: **Semester pass** — $14.99 one-time for 4 months of Plus, no auto-renew. Students think in semesters and distrust auto-renewal. Avoid a lifetime deal: unlimited video cost makes it unsafe.

Launch discount: founding-member yearly Plus at $19.99 for the first 30 days (price locked while subscribed). No free trial: the owner chose to charge from day one; the Free tier is the trial.

Free-tier changes implied by this ladder: videos drop from 10/day to 2/day and quizzes become 1/day for guests and free accounts. These are the only take-aways from current users.

## Unit economics

- Plus, worst case: 10 videos/day × $0.15 × 30 = $45/month against $4.99 revenue. Realistic median usage is a few videos per month, so the tier is profitable in aggregate; monitor the heavy tail.
- Unlimited, worst case at the 30/day fair-use cap: ~$135/month against $9.99. The cap is mandatory.
- Card fees: Stripe takes ~9% of a $4.99 charge but ~4% of $29.99, another reason to default to yearly. With 16 languages and a global student audience, a merchant-of-record (Paddle or Lemon Squeezy) removes VAT/GST handling and supports localized (purchasing-power) pricing; Stripe Tax + Adaptive Pricing is the alternative.

## Revenue expectation (honest range)

Freemium education sites whose core stays free convert 0.2–1% of monthly uniques. At ~60k monthly uniques and a blended ~$3.50/subscriber/month (mostly yearly):

| Scenario | Paying users | MRR |
|---|---|---|
| Conservative (0.2%) | ~120 | ~$420 |
| Base (0.5%) | ~300 | ~$1,050 |
| Good (1%) | ~600 | ~$2,100 |

Growth comes from traffic and from better gate moments, not from raising prices.

## Implementation hooks (when decided)

- Paid plans require a verified account (already exists). Store the plan in Firestore next to the video quota, e.g. `users/{uid}/entitlements/plan` {tier, status, renewsAt, provider customer id}, written only by the billing webhook.
- Extend `src/lib/video/quota.ts` / `jobs.ts` so the daily limit comes from the plan tier instead of `DEFAULT_DAILY_VIDEO_LIMIT`; add the same per-tier metering to `/api/ocr` and `/api/practice` for signed-in users and a per-IP/Turnstile-backed daily cap for guests.
- Web checkout via Stripe Checkout or a merchant-of-record hosted page; webhook → Firestore; customer portal for cancel/upgrade.
- Mobile: the Flutter app currently has no billing by design. Selling subscriptions inside the app requires App Store / Play IAP (15% small-business commission); start web-only and let the app read the entitlement. Do not link out to web checkout from the app outside the US.
- Mark `/pricing` indexable; keep the free promise visible on it.

## Open decisions

- Accept the ladder, or one paid tier only (Plus) to start.
- Exact free allowances (2 videos/day and 1 quiz/day are the recommendation).
- Payment provider: Stripe vs merchant-of-record.
- Whether to enable regional pricing at launch.

## Implementation (2026-10-31, live)

**Approach.** Stripe-hosted Checkout and Customer Portal, web only; no Stripe.js on our pages and no card data on our servers. Prices are found by Stripe *lookup key* so the app needs no per-price env vars; `node scripts/stripe-setup.mjs` idempotently creates the two products, four recurring prices, and a Customer Portal configuration (cancel at period end, switch price with proration, update card, invoices). It refuses a live key without `--live`. The sandbox already contains these objects.

**Entitlements.** `users/{uid}/entitlements/plan` holds `{tier, status, interval, priceLookupKey, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd, trialEnd, eventCreated}`; `users/{uid}/entitlements/billing` holds the Stripe customer id. Both are under the existing server-only `entitlements` rules, so clients can neither read nor write them. Effective tier = stored tier while status is `trialing`, `active`, or `past_due` within a 7-day grace after the period end; anything else is `free`. Out-of-order webhooks are resolved by `eventCreated`, and an ended subscription can never hide a newer live one (`shouldApplyEntitlement`).

**Flow.** `/pricing` → `POST /api/billing/checkout` (verified Firebase user; `client_reference_id` and subscription metadata carry the uid; no trial period, so the first charge happens at checkout; promotion codes allowed; `STRIPE_AUTOMATIC_TAX=true` adds Stripe Tax once enabled in the Dashboard) → Stripe → back to `/pricing?checkout=success&session_id=…` → `POST /api/billing/sync` confirms the session immediately (webhooks can lag and local dev receives none) → `POST /api/billing/webhook` keeps the doc current for renewals, cancellations, and failed payments (`checkout.session.completed`, `customer.subscription.created|updated|deleted`). `POST /api/billing/portal` opens the Customer Portal; an active subscriber who tries to buy again gets `409 already_subscribed` and is sent there instead. Account deletion cancels the subscription first. The video daily limit now comes from the plan tier (`dailyVideoLimitForPlan`) in every quota read, including the mobile API; the dialog shows a "See plans" action when the limit is hit on a non-Unlimited tier.

**Daily limits (enforced 2026-10-31).** `src/lib/billing/usage.ts` meters scans (`/api/ocr`) and quizzes (`/api/practice`) against `PLAN_LIMITS` (Free 5 scans and 1 quiz per UTC day; paid tiers unlimited). Signed-in users (the chat sends the Firebase ID token when available) are counted in the server-only doc `users/{uid}/entitlements/usage`, with the limit taken from the plan entitlement; paid tiers write nothing. Web guests are counted in an HMAC-signed, httpOnly `ms_usage` cookie (`GUEST_USAGE_SECRET`), a deliberate soft gate that never blocks a shared school IP. Anonymous mobile requests (`guestCookies: false`) pass unmetered until the Flutter app sends an ID token; signed-in mobile users are metered. The check runs before the model call and usage is recorded only after success, so failed scans cost nothing. A limit returns `429 {code: "daily_limit_reached", feature, limit, used, resetsAt, tier}` with neutral wording (store rules forbid pointing mobile users at a web purchase); the web chat dispatches `mathsolver:usage-limit` and `UsageLimitToast` shows the translated message with a "See plans" link.

**UI.** `src/components/billing/PricingPage.tsx`: yearly default with a "Save 50%" pill, Plus highlighted as "Most popular" (first on mobile), per-month price with the monthly list price struck through on yearly, trust row, four-question FAQ, legal line. Guests who pick a plan go through the existing sign-in dialog (`mathsolver:open-auth`) and continue to checkout automatically once verified. `BillingContext` (inside `AuthProvider`) supplies plan status to the sidebar "Upgrade / Your plan" item, the mobile header pill, and the video dialog. Terms (section 3–5) and Privacy (payment data, Stripe as processor, retention, choices) were updated for Stripe's business-information requirements.

**Tests.** `tests/billing.test.mjs` (catalog, entitlement mapping, grace, event ordering, public shape), `tests/billing-checkout-route.test.mjs` (auth, catalog validation, customer parameters, no trial period, 409 for subscribers), `tests/billing-webhook-route.test.mjs` (real signature verification, tamper rejection, retry on failure), and `tests/billing-integration.test.mjs`, the local sandbox of the whole chain against an in-process Firestore fake (`tests/helpers/fake-firestore.mjs`): checkout completion → plan doc → video allowance and unlimited scans; free-account Firestore metering and UTC reset; guest cookie metering, tampering, and separate counters; the real OCR/practice handlers returning 429 and setting cookies; event ordering and cancellation back to free; account-bound success sync; deletion cancelling the Stripe subscription. The Firestore emulator was not used because this machine has no Java runtime. Run with `node --test tests/billing*.test.mjs`.

**Owner alerts.** `src/lib/billing/alerts.ts` posts plain-text messages to a private Telegram chat (`BILLING_TELEGRAM_BOT_TOKEN`, `BILLING_TELEGRAM_CHAT_ID`, server-only, separate from the contact-form bot) for every billing incident and payment: checkout or portal could not be opened (Stripe or server error, not sign-in or validation 4xx), the success-page sync failed, webhook processing failed (Stripe will retry), a webhook signature was rejected (one alert per 15 minutes, with a suppressed count), a billable subscription could not be matched to an account or catalog price, a renewal payment failed (`invoice.payment_failed`, registered on the endpoint), plus ✅ payment received (plan, amount, email, account, whether the plan is active) and ℹ️ subscription ended. Delivery never throws, times out after 5 s, and carries ids and error summaries only. Tested in `tests/billing-alerts.test.mjs`.

**Launch record (2026-10-31).** Live keys were stored in the ignored root `.env` (sandbox pair kept as `STRIPE_SANDBOX_*`) and `node scripts/stripe-setup.mjs --live --webhook` created the live products, four prices, the default portal configuration `bpc_1UWgE7BW7J8wsv3I8ma8Cl2y`, and webhook `we_1UWgE8BW7J8wsv3IfMBSjxKu` on `https://math-solver.io/api/billing/webhook`. The live account is activated (charges and payouts enabled, statement descriptor `MATH SOLVER`), and a live Checkout Session was created and expired as a smoke check. Production secrets `stripe-secret-key`, `stripe-webhook-secret`, `guest-usage-secret` (generated for production, different from local), `billing-telegram-bot-token`, `billing-telegram-chat-id` were added to the Azure Container App and bound in the release template; see [[azure-migration]] for the revision, checks, and rollback. Still optional for the owner: a support email in the Stripe Dashboard business profile, a `FOUNDING` promotion code, and Stripe Tax (`STRIPE_AUTOMATIC_TAX=true`) once enabled in the Dashboard.

**Not built yet (follow-ups).**
- Anonymous mobile scans and quizzes are unmetered until the Flutter app sends the Firebase ID token on `/api/mobile/v1/ocr` and `/api/mobile/v1/practice` (a store release); the server already meters signed-in mobile users.
- Guest web metering is a signed cookie by design (clearing cookies resets it); add Firestore-backed guest buckets only if abuse appears.
- Unlimited's "download videos / 90-day retention" from the proposal were dropped from the page because they are not built.
- Semester pass (one-time) and regional (purchasing-power) pricing.
- Mobile in-app purchases; the Flutter app sells nothing and should read the web entitlement.
- Plan-change UX inside the app beyond the Customer Portal.

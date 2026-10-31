"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import {
  PLAN_NAMES,
  PLAN_PRICES,
  PLAN_TAGLINES,
  formatUsd,
  monthlyEquivalentCents,
  planFeatures,
  yearlySavingsPercent,
  type BillingInterval,
  type PaidPlanTier,
  type PlanTier,
} from "@/lib/billing/plans";
import { trackEvent } from "@/lib/analytics";

const TIERS: PlanTier[] = ["free", "plus", "unlimited"];

const FAQ = [
  {
    q: "Is step-by-step solving still free?",
    a: "Yes. Typed problems with full steps stay free, with no account. Paid plans add more scans, quizzes, and video lessons.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade, downgrade, or change your billing period any time from Manage billing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, from Manage billing. You keep your plan until the end of the period you paid for.",
  },
  {
    q: "How do payments work?",
    a: "Checkout is handled by Stripe, which accepts cards and local payment methods. MathSolver never sees your card number.",
  },
];

type Notice =
  | { kind: "confirming" }
  | { kind: "success"; tier: PlanTier }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PricingPage() {
  const { user, isAuthReady, canSyncNotebook } = useAuth();
  const {
    plan,
    isPlanLoaded,
    isBusy,
    billingEnabled,
    error,
    clearError,
    startCheckout,
    openBillingPortal,
    confirmCheckout,
  } = useBilling();
  const [interval, setBillingInterval] = useState<BillingInterval>("year");
  const [pending, setPending] = useState<PaidPlanTier | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Return from Stripe Checkout. Read once, then clean the address bar.
  useEffect(() => {
    const url = new URL(window.location.href);
    const state = url.searchParams.get("checkout");
    if (!state) return;
    const session = url.searchParams.get("session_id");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(
      state === "success" ? { kind: "confirming" } : { kind: "cancelled" },
    );
    if (state === "success" && session) setSessionId(session);
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  useEffect(() => {
    if (!sessionId || !isAuthReady || !user || !canSyncNotebook) return;
    let cancelled = false;
    void confirmCheckout(sessionId).then((confirmed) => {
      if (cancelled) return;
      setSessionId(null);
      setNotice(
        confirmed && confirmed.tier !== "free"
          ? { kind: "success", tier: confirmed.tier }
          : {
              kind: "error",
              message:
                "Your payment went through and your plan will appear here within a few minutes.",
            },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, isAuthReady, user, canSyncNotebook, confirmCheckout]);

  // A guest who picked a plan is sent to sign in; continue once verified.
  useEffect(() => {
    if (!pending || !user || !canSyncNotebook) return;
    const tier = pending;
    void startCheckout(tier, interval).finally(() => setPending(null));
  }, [pending, user, canSyncNotebook, interval, startCheckout]);

  const choose = useCallback(
    (tier: PaidPlanTier) => {
      clearError();
      trackEvent("pricing_select", { tier, interval });
      if (!user || !canSyncNotebook) {
        setPending(tier);
        window.dispatchEvent(new Event("mathsolver:open-auth"));
        return;
      }
      void startCheckout(tier, interval);
    },
    [canSyncNotebook, clearError, interval, startCheckout, user],
  );

  const savings = yearlySavingsPercent("plus");
  const isPaid = plan.tier !== "free";

  return (
    <div className="min-h-full px-4 pb-16 pt-20 sm:px-6 md:pt-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {(notice || error) && (
          <NoticeBanner
            notice={notice}
            error={error}
            onClose={() => {
              setNotice(null);
              clearError();
            }}
          />
        )}

        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Step-by-step solving stays free
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Learn faster for less than a coffee
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Unlock unlimited scans, unlimited practice, and video lessons that
            teach the idea, not just the answer.
          </p>

          <div
            className="mt-8 inline-flex items-center rounded-full border border-black/8 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            role="group"
            aria-label="Billing period"
          >
            {(["month", "year"] as BillingInterval[]).map((option) => {
              const active = interval === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBillingInterval(option)}
                  className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary-600 text-white shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "month" ? "Monthly" : "Yearly"}
                  {option === "year" && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      Save {savings}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3 md:items-stretch">
          {TIERS.map((tier) => (
            <PlanCard
              key={tier}
              tier={tier}
              interval={interval}
              currentTier={isPlanLoaded ? plan.tier : null}
              cancelAtPeriodEnd={plan.cancelAtPeriodEnd}
              periodEnd={plan.currentPeriodEnd}
              isPaidUser={isPaid}
              busy={isBusy || pending !== null}
              disabled={!billingEnabled}
              onChoose={choose}
              onManage={() => void openBillingPortal()}
            />
          ))}
        </div>

        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Instant access
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure
            checkout by Stripe
          </span>
        </p>

        <section className="mx-auto mt-12 max-w-2xl">
          <h2 className="text-center text-lg font-bold text-foreground">
            Quick answers
          </h2>
          <div className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/60 dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900/50">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By subscribing you agree to the{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            . Prices in USD; taxes may apply.
          </p>
        </section>
      </div>
    </div>
  );
}

function PlanCard({
  tier,
  interval,
  currentTier,
  cancelAtPeriodEnd,
  periodEnd,
  isPaidUser,
  busy,
  disabled,
  onChoose,
  onManage,
}: {
  tier: PlanTier;
  interval: BillingInterval;
  currentTier: PlanTier | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: number | null;
  isPaidUser: boolean;
  busy: boolean;
  disabled: boolean;
  onChoose: (tier: PaidPlanTier) => void;
  onManage: () => void;
}) {
  const highlighted = tier === "plus";
  const isCurrent = currentTier === tier;
  const features = planFeatures(tier);
  const paidTier = tier === "free" ? null : tier;
  const monthly = paidTier ? monthlyEquivalentCents(paidTier, interval) : 0;
  const yearlyTotal = paidTier ? PLAN_PRICES[paidTier].year.amountCents : 0;
  const monthlyList = paidTier ? PLAN_PRICES[paidTier].month.amountCents : 0;

  return (
    <article
      className={`relative flex flex-col rounded-3xl border p-6 transition-shadow ${
        highlighted
          ? "order-first border-primary-500 bg-white shadow-xl ring-2 ring-primary-500/60 dark:bg-zinc-900 md:order-none md:-translate-y-2"
          : "border-black/8 bg-white/70 dark:border-white/10 dark:bg-zinc-900/60"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
          Most popular
        </span>
      )}
      {tier === "unlimited" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm dark:border-white/10 dark:bg-zinc-900">
          Exam season
        </span>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{PLAN_NAMES[tier]}</h2>
        {isCurrent && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Current plan
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINES[tier]}</p>

      <div className="mt-5 flex items-end gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-foreground">
          {paidTier ? formatUsd(monthly) : "$0"}
        </span>
        <span className="pb-1.5 text-sm text-muted-foreground">
          {paidTier ? "/mo" : "forever"}
        </span>
        {paidTier && interval === "year" && (
          <span className="pb-1.5 text-sm text-muted-foreground line-through">
            {formatUsd(monthlyList)}
          </span>
        )}
      </div>
      <p className="mt-1 h-5 text-xs text-muted-foreground">
        {paidTier
          ? interval === "year"
            ? `${formatUsd(yearlyTotal)} billed yearly, cancel anytime`
            : `${formatUsd(monthlyList)} billed monthly, cancel anytime`
          : "No account needed"}
      </p>

      <div className="mt-5">
        {paidTier ? (
          isCurrent ? (
            <button
              type="button"
              onClick={onManage}
              disabled={busy}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/10 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Manage billing
            </button>
          ) : isPaidUser ? (
            <button
              type="button"
              onClick={onManage}
              disabled={busy}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/10 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Switch in Manage billing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChoose(paidTier)}
              disabled={busy || disabled}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                highlighted
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700"
                  : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {disabled ? "Coming soon" : `Get ${PLAN_NAMES[tier]}`}
            </button>
          )
        ) : isCurrent || currentTier === null ? (
          <Link
            href="/"
            className="block w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {isCurrent ? "Keep solving free" : "Start solving free"}
          </Link>
        ) : (
          <span className="block w-full rounded-xl border border-dashed border-black/10 px-4 py-3 text-center text-sm text-muted-foreground dark:border-white/10">
            Included in your plan
          </span>
        )}
      </div>

      {isCurrent && paidTier && periodEnd && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {cancelAtPeriodEnd
            ? `Ends ${formatDate(periodEnd)}`
            : `Renews ${formatDate(periodEnd)}`}
        </p>
      )}

      <ul className="mt-6 space-y-2.5 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                highlighted ? "text-primary-600" : "text-emerald-500"
              }`}
            />
            <span className="text-foreground/90">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function NoticeBanner({
  notice,
  error,
  onClose,
}: {
  notice: Notice | null;
  error: string | null;
  onClose: () => void;
}) {
  const tone =
    notice?.kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : notice?.kind === "confirming"
        ? "border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-200"
        : notice?.kind === "cancelled"
          ? "border-black/8 bg-white text-foreground dark:border-white/10 dark:bg-zinc-900"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  const text =
    notice?.kind === "success"
      ? `Welcome to ${PLAN_NAMES[notice.tier]}! Your plan is active.`
      : notice?.kind === "confirming"
        ? "Confirming your purchase…"
        : notice?.kind === "cancelled"
          ? "Checkout was cancelled. No charge was made."
          : (notice?.kind === "error" ? notice.message : null) ?? error;
  if (!text) return null;

  return (
    <div
      role="status"
      className={`mb-8 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}
    >
      {notice?.kind === "success" ? (
        <PartyPopper className="h-4 w-4 shrink-0" />
      ) : notice?.kind === "confirming" ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : null}
      <span className="flex-1">{text}</span>
      {notice?.kind !== "confirming" && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

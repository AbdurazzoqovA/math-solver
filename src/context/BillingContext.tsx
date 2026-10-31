"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  BillingClientError,
  confirmCheckoutSession,
  createCheckoutSession,
  createPortalSession,
  fetchPlanStatus,
} from "@/lib/billing/client";
import {
  PLAN_LIMITS,
  type BillingInterval,
  type PaidPlanTier,
  type PlanTier,
} from "@/lib/billing/plans";
import type { PublicPlanStatus } from "@/lib/billing/subscription-state";
import { trackEvent } from "@/lib/analytics";

export const FREE_PLAN_STATUS: PublicPlanStatus = {
  tier: "free",
  status: "none",
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
  canManageBilling: false,
  limits: PLAN_LIMITS.free,
};

type BillingContextValue = {
  plan: PublicPlanStatus;
  tier: PlanTier;
  isPlanLoaded: boolean;
  isBusy: boolean;
  billingEnabled: boolean;
  error: string | null;
  clearError: () => void;
  refreshPlan: () => Promise<void>;
  startCheckout: (tier: PaidPlanTier, interval: BillingInterval) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  confirmCheckout: (sessionId: string) => Promise<PublicPlanStatus | null>;
};

const BillingContext = createContext<BillingContextValue | undefined>(
  undefined,
);

function errorMessage(error: unknown): string {
  return error instanceof BillingClientError
    ? error.message
    : "The billing service is unavailable. Please try again.";
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady, canSyncNotebook, getAuthToken } = useAuth();
  const [plan, setPlan] = useState<PublicPlanStatus>(FREE_PLAN_STATUS);
  const [isPlanLoaded, setIsPlanLoaded] = useState(false);
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.uid ?? null;

  const loadPlan = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    const response = await fetchPlanStatus(token);
    setPlan(response.plan);
    setBillingEnabled(response.billingEnabled);
  }, [getAuthToken]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!uid || !canSyncNotebook) {
      // Guests and unverified accounts are on the free plan by definition.
      setPlan(FREE_PLAN_STATUS);
      setIsPlanLoaded(true);
      return;
    }
    let cancelled = false;
    setIsPlanLoaded(false);
    loadPlan()
      .catch(() => {
        // A failed status read must never block solving; stay on free.
      })
      .finally(() => {
        if (!cancelled) setIsPlanLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, canSyncNotebook, isAuthReady, loadPlan]);

  const refreshPlan = useCallback(async () => {
    try {
      await loadPlan();
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }, [loadPlan]);

  const openBillingPortal = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new BillingClientError("Sign in first.", "auth", 401);
      const { url } = await createPortalSession(token);
      trackEvent("billing_portal_open");
      window.location.assign(url);
    } catch (portalError) {
      setError(errorMessage(portalError));
      setIsBusy(false);
    }
  }, [getAuthToken]);

  const startCheckout = useCallback(
    async (tier: PaidPlanTier, interval: BillingInterval) => {
      setIsBusy(true);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new BillingClientError("Sign in first.", "auth", 401);
        const { url } = await createCheckoutSession(token, tier, interval);
        trackEvent("checkout_start", { tier, interval });
        window.location.assign(url);
      } catch (checkoutError) {
        if (
          checkoutError instanceof BillingClientError &&
          checkoutError.code === "already_subscribed"
        ) {
          await openBillingPortal();
          return;
        }
        setError(errorMessage(checkoutError));
        setIsBusy(false);
      }
    },
    [getAuthToken, openBillingPortal],
  );

  const confirmCheckout = useCallback(
    async (sessionId: string) => {
      try {
        const token = await getAuthToken();
        if (!token) return null;
        const response = await confirmCheckoutSession(token, sessionId);
        setPlan(response.plan);
        if (response.plan.tier !== "free") {
          trackEvent("checkout_complete", {
            tier: response.plan.tier,
            interval: response.plan.interval ?? "unknown",
          });
        }
        return response.plan;
      } catch (confirmError) {
        setError(errorMessage(confirmError));
        return null;
      }
    },
    [getAuthToken],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<BillingContextValue>(
    () => ({
      plan,
      tier: plan.tier,
      isPlanLoaded,
      isBusy,
      billingEnabled,
      error,
      clearError,
      refreshPlan,
      startCheckout,
      openBillingPortal,
      confirmCheckout,
    }),
    [
      plan,
      isPlanLoaded,
      isBusy,
      billingEnabled,
      error,
      clearError,
      refreshPlan,
      startCheckout,
      openBillingPortal,
      confirmCheckout,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error("useBilling must be used within a BillingProvider");
  return value;
}

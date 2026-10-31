import "server-only";

import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  publicPlanStatus,
  readPlanEntitlement,
  shouldApplyEntitlement,
  type PlanEntitlementDocument,
  type PublicPlanStatus,
} from "./subscription-state.ts";

// users/{uid}/entitlements/plan   — current subscription state (server-only)
// users/{uid}/entitlements/billing — Stripe customer identity (server-only)
// Both live under the existing server-only entitlements collection, so the
// Firestore rules already deny every client read and write.

function planRef(uid: string) {
  return getAdminFirestore().doc(`users/${uid}/entitlements/plan`);
}

function billingRef(uid: string) {
  return getAdminFirestore().doc(`users/${uid}/entitlements/billing`);
}

export async function getPlanEntitlement(
  uid: string,
): Promise<PlanEntitlementDocument | null> {
  const snapshot = await planRef(uid).get();
  return readPlanEntitlement(snapshot.data());
}

export async function getPublicPlanStatus(
  uid: string,
): Promise<PublicPlanStatus> {
  const [planSnapshot, customerId] = await Promise.all([
    planRef(uid).get(),
    getStripeCustomerId(uid),
  ]);
  const status = publicPlanStatus(planSnapshot.data());
  return { ...status, canManageBilling: Boolean(customerId) };
}

export async function getStripeCustomerId(
  uid: string,
): Promise<string | null> {
  const snapshot = await billingRef(uid).get();
  const customerId = snapshot.data()?.stripeCustomerId;
  return typeof customerId === "string" && customerId ? customerId : null;
}

export async function recordStripeCustomer(
  uid: string,
  stripeCustomerId: string,
): Promise<void> {
  await billingRef(uid).set(
    { schemaVersion: 1, stripeCustomerId, updatedAt: Date.now() },
    { merge: true },
  );
}

// Returns false when a newer state is already stored or the account is gone.
export async function applyPlanEntitlement(
  uid: string,
  incoming: PlanEntitlementDocument,
): Promise<boolean> {
  const db = getAdminFirestore();
  const ref = planRef(uid);
  const deletedUserRef = db.doc(`deletedUsers/${uid}`);
  return db.runTransaction(async (transaction) => {
    const [snapshot, deletedUser] = await Promise.all([
      transaction.get(ref),
      transaction.get(deletedUserRef),
    ]);
    if (deletedUser.exists) return false;
    if (!shouldApplyEntitlement(snapshot.data(), incoming)) return false;
    transaction.set(ref, incoming);
    return true;
  });
}

import type { Metadata } from "next";
import PricingPage from "@/components/billing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing - MathSolver Plus and Unlimited",
  description:
    "Step-by-step math solving stays free. Plus from $2.50 a month adds unlimited scans, unlimited practice quizzes, and 10 video lessons a day. Cancel anytime.",
  alternates: { canonical: "/pricing" },
};

export default function PricingRoute() {
  return <PricingPage />;
}

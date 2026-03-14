import type { Metadata } from "next";
import PracticeTestsPage from "@/components/practice/PracticeTestsPage";

export const metadata: Metadata = {
  title: "Practice Tests - MathSolver | Test Your Math Skills",
  description:
    "Review and retake your AI-generated math practice tests. Sharpen your skills with multiple-choice questions tailored to your learning.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PracticeTestsRoute() {
  return (
    <div className="w-full h-full bg-background relative">
      <PracticeTestsPage />
    </div>
  );
}

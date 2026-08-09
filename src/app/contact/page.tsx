import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircleMore } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact MathSolver | Support and Feedback",
  description:
    "Contact MathSolver support to ask a question, report a problem, or share feedback.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact MathSolver",
    description:
      "Ask a question, report a problem, or share feedback with MathSolver.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-full bg-background px-4 py-20 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="mt-10 grid w-full grid-cols-1 gap-12 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-start lg:gap-20">
          <section className="md:sticky md:top-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <MessageCircleMore className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-7 max-w-lg text-4xl font-bold tracking-tight sm:text-5xl">
              How can we help?
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Send a question, report a problem, or tell us what would make MathSolver better.
            </p>

            <div className="mt-10 border-t border-border pt-7">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Prefer email?</p>
                  <a
                    href="mailto:support@math-solver.io"
                    className="mt-1 inline-block text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                  >
                    support@math-solver.io
                  </a>
                </div>
              </div>
            </div>
          </section>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | MathSolver",
  description: "Terms for using the MathSolver website and mobile apps.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">Terms of Service</h1>

        <div className="prose prose-zinc max-w-none text-muted-foreground dark:prose-invert">
          <p className="mb-6">Effective and last updated: August 9, 2026</p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">1. Agreement and Scope</h2>
          <p className="mb-4">
            These Terms apply when you access or use MathSolver through math-solver.io or the MathSolver iOS or Android app (the &quot;Service&quot;). By using the Service, you agree to these Terms and our{" "}<Link className="text-foreground underline" href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service. Your download from Apple or Google may also be subject to that platform&apos;s terms.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">2. Educational Service</h2>
          <p className="mb-4">
            MathSolver is an AI-assisted educational tool for students and general learners to solve, check, and practice math. You may use it only for lawful educational purposes and consistently with the school, family, and local rules that apply to you.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">3. Free Access and Daily Video Limit</h2>
          <p className="mb-4">
            MathSolver is completely free at launch. There are no subscriptions, paid plans, in-app purchases, or purchase gates. Written solving, OCR, work checking, practice, and notebook features have no product usage limit. A verified account may generate up to 10 visual lessons per day, resetting at 00:00 UTC. Reasonable technical safeguards may still prevent abuse, automated traffic, or activity that threatens service reliability.
          </p>
          <p className="mb-4">
            We may introduce advertising in a future release while keeping the Service free. If advertising changes how personal data is handled, we will update the Privacy Policy and provide any choices or consent required by law before that change applies.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">4. Accounts and Deletion</h2>
          <p className="mb-4">
            An account is optional for core solving but required for private cloud sync and visual lessons. You are responsible for keeping account credentials secure and for activity under your account. You may permanently delete your account and associated cloud data in the app or follow the instructions at{" "}<Link className="text-foreground underline" href="/account-deletion">math-solver.io/account-deletion</Link>.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">5. Acceptable Use</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Use the Service for unlawful, harmful, fraudulent, or abusive activity.</li>
            <li>Submit content you do not have the right to process.</li>
            <li>Scrape, mine, probe, disrupt, overload, or bypass security or usage controls.</li>
            <li>Attempt to reverse engineer the Service or third-party AI models.</li>
            <li>Use answers where an exam, school, or other applicable rule prohibits assistance.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">6. Your Content</h2>
          <p className="mb-4">
            You keep your rights in questions, equations, images, and other content you submit. You grant MathSolver and its service providers a limited, non-exclusive license to host, transmit, process, reproduce, and transform that content only as needed to provide, secure, maintain, and troubleshoot the Service you request. We do not claim ownership of your submitted content.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">7. AI Output and Academic Use</h2>
          <p className="mb-4">
            AI-generated solutions, extracted text, practice questions, and videos can be incomplete, inaccurate, or inappropriate for a particular purpose. Check important steps and calculations independently. MathSolver is a learning aid, not a substitute for a teacher, professional advice, or your own judgment. You remain responsible for following academic-integrity rules that apply to you.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">8. MathSolver Rights and Third-Party Services</h2>
          <p className="mb-4">
            The Service&apos;s software, design, branding, and original materials belong to MathSolver or its licensors. The Service depends on third-party platforms, AI APIs, authentication, hosting, and app stores. Their availability and terms can affect the Service, and links to third-party sites are governed by those sites&apos; own terms and privacy policies.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">9. Availability, Updates, and Suspension</h2>
          <p className="mb-4">
            We may change, maintain, or discontinue features and cannot promise uninterrupted availability. Ordinary app updates may be encouraged and remain dismissible. We may require a minimum app version only when an older release is genuinely incompatible with the Service or creates a material security, privacy, or data-integrity risk—not merely because a future version adds advertising.
          </p>
          <p className="mb-4">
            We may restrict or suspend access that violates these Terms, threatens the Service, or creates legal or security risk. Where practical, we will use a proportionate response.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">10. Disclaimers</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of accuracy, completeness, fitness for a particular purpose, non-infringement, or uninterrupted availability. Nothing in these Terms excludes rights that cannot legally be excluded.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">11. Limitation of Liability</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, MathSolver and its suppliers will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, use, goodwill, or profits arising from the Service. This limitation does not apply where liability cannot legally be limited.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">12. Changes to These Terms</h2>
          <p className="mb-4">
            We may update these Terms as the Service or legal requirements change. We will post the revised Terms here, update their effective date, and provide additional notice when required. Your continued use after revised Terms take effect means you accept them.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">13. Contact</h2>
          <p className="mb-4">
            Questions about these Terms can be sent to{" "}<a className="text-foreground underline" href="mailto:support@math-solver.io">support@math-solver.io</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

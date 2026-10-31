import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | MathSolver",
  description: "Terms for using the MathSolver website, paid plans, and mobile apps.",
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
          <p className="mb-6">Effective and last updated: October 31, 2026</p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">1. Agreement and Scope</h2>
          <p className="mb-4">
            These Terms apply when you access or use MathSolver through math-solver.io or the MathSolver iOS or Android app (the &quot;Service&quot;). By using the Service, you agree to these Terms and our{" "}<Link className="text-foreground underline" href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service. Your download from Apple or Google may also be subject to that platform&apos;s terms.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">2. Educational Service</h2>
          <p className="mb-4">
            MathSolver is an AI-assisted educational tool for students and general learners to solve, check, and practice math. You may use it only for lawful educational purposes and consistently with the school, family, and local rules that apply to you.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">3. Free Access, Paid Plans, and Usage Limits</h2>
          <p className="mb-4">
            Typed step-by-step solving is free and does not require an account. Some features have a daily allowance on the free plan, such as photo, PDF, and drawing scans, practice quizzes, and video lessons. The current allowances and the features included in each plan are shown on our{" "}<Link className="text-foreground underline" href="/pricing">pricing page</Link>. Allowances reset at 00:00 UTC.
          </p>
          <p className="mb-4">
            Paid plans (&quot;Plus&quot; and &quot;Unlimited&quot;) raise or remove those allowances. &quot;Unlimited&quot; features remain subject to a fair-use limit that is stated on the pricing page and protects the Service for all learners. Reasonable technical safeguards may also prevent abuse, automated traffic, account sharing, or activity that threatens service reliability. We may change plans, prices, and allowances over time; changes to a plan you already pay for are handled as described in Section 4.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">4. Payments, Renewals, Cancellation, and Refunds</h2>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li><strong>Where plans are sold:</strong> Paid plans are sold on math-solver.io to verified accounts. The mobile apps do not currently sell subscriptions; a plan purchased on the website applies to the same account in the apps where the feature is available.</li>
            <li><strong>Prices and taxes:</strong> Prices are shown in U.S. dollars at checkout. Applicable taxes may be added based on your billing address. Promotional prices apply only for the period and conditions stated in the promotion.</li>
            <li><strong>Payment processing:</strong> Payments are processed by Stripe. Your card or payment details are provided directly to Stripe and are governed by Stripe&apos;s terms and privacy policy. MathSolver does not receive or store full card numbers.</li>
            <li><strong>Automatic renewal:</strong> Subscriptions renew automatically for the same period (monthly or yearly) at the then-current price until you cancel. Stripe charges your saved payment method at each renewal.</li>
            <li><strong>Cancellation:</strong> You can cancel at any time from &quot;Manage billing&quot; on the pricing page, which opens the Stripe billing portal. Cancellation stops future renewals; your plan stays active until the end of the period you already paid for, and no further charges are made.</li>
            <li><strong>Refunds:</strong> Except where the law requires otherwise, fees are non-refundable and we do not provide refunds or credits for partial periods or unused allowances. If you believe a charge was made in error, contact{" "}<a className="text-foreground underline" href="mailto:support@math-solver.io">support@math-solver.io</a>{" "}within 14 days of the charge and we will review it in good faith.</li>
            <li><strong>Price changes:</strong> If we change the price of your plan, we will notify you by email at least 30 days before the new price applies to your next renewal. You can cancel before then to avoid the new price; continuing after the change means you accept it.</li>
            <li><strong>Failed payments:</strong> If a renewal payment fails, Stripe may retry it. We may reduce your account to the free plan if payment is not completed within a reasonable time.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">5. Accounts and Deletion</h2>
          <p className="mb-4">
            An account is optional for core solving but required for private cloud sync, video lessons, and paid plans. You are responsible for keeping account credentials secure and for activity under your account, and a paid plan is for one learner&apos;s personal use. You may permanently delete your account and associated cloud data in the app or follow the instructions at{" "}<Link className="text-foreground underline" href="/account-deletion">math-solver.io/account-deletion</Link>. Deleting an account cancels any active subscription on it; cancel first in the billing portal if you want to keep access until the end of the paid period.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">6. Acceptable Use</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Use the Service for unlawful, harmful, fraudulent, or abusive activity.</li>
            <li>Submit content you do not have the right to process.</li>
            <li>Scrape, mine, probe, disrupt, overload, or bypass security, usage, or payment controls.</li>
            <li>Share a paid account or resell access to the Service.</li>
            <li>Attempt to reverse engineer the Service or third-party AI models.</li>
            <li>Use answers where an exam, school, or other applicable rule prohibits assistance.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">7. Your Content</h2>
          <p className="mb-4">
            You keep your rights in questions, equations, images, and other content you submit. You grant MathSolver and its service providers a limited, non-exclusive license to host, transmit, process, reproduce, and transform that content only as needed to provide, secure, maintain, and troubleshoot the Service you request. We do not claim ownership of your submitted content.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">8. AI Output and Academic Use</h2>
          <p className="mb-4">
            AI-generated solutions, extracted text, practice questions, and videos can be incomplete, inaccurate, or inappropriate for a particular purpose. Check important steps and calculations independently. MathSolver is a learning aid, not a substitute for a teacher, professional advice, or your own judgment. You remain responsible for following academic-integrity rules that apply to you.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">9. MathSolver Rights and Third-Party Services</h2>
          <p className="mb-4">
            The Service&apos;s software, design, branding, and original materials belong to MathSolver or its licensors. The Service depends on third-party platforms, AI APIs, authentication, hosting, payment processing, and app stores. Their availability and terms can affect the Service, and links to third-party sites are governed by those sites&apos; own terms and privacy policies.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">10. Availability, Updates, and Suspension</h2>
          <p className="mb-4">
            We may change, maintain, or discontinue features and cannot promise uninterrupted availability. If we permanently discontinue a paid feature that is central to your plan, we will offer a proportional refund of prepaid fees for the unused period or an equivalent alternative. Ordinary app updates may be encouraged and remain dismissible. We may require a minimum app version only when an older release is genuinely incompatible with the Service or creates a material security, privacy, or data-integrity risk.
          </p>
          <p className="mb-4">
            We may restrict or suspend access that violates these Terms, threatens the Service, or creates legal or security risk. Where practical, we will use a proportionate response.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">11. Disclaimers</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of accuracy, completeness, fitness for a particular purpose, non-infringement, or uninterrupted availability. Nothing in these Terms excludes rights that cannot legally be excluded, including consumer rights that apply to paid subscriptions in your country.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">12. Limitation of Liability</h2>
          <p className="mb-4">
            To the maximum extent permitted by law, MathSolver and its suppliers will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, use, goodwill, or profits arising from the Service, and our total liability for any claim relating to a paid plan will not exceed the amount you paid us for that plan in the 12 months before the claim. This limitation does not apply where liability cannot legally be limited.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">13. Changes to These Terms</h2>
          <p className="mb-4">
            We may update these Terms as the Service or legal requirements change. We will post the revised Terms here, update their effective date, and provide additional notice when required, including by email for changes that materially affect paid plans. Your continued use after revised Terms take effect means you accept them.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">14. Contact</h2>
          <p className="mb-4">
            Questions about these Terms, billing, or a charge can be sent to{" "}<a className="text-foreground underline" href="mailto:support@math-solver.io">support@math-solver.io</a>{" "}or through our{" "}<Link className="text-foreground underline" href="/contact">contact form</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

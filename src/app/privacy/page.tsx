import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | MathSolver",
  description:
    "How MathSolver collects, uses, shares, retains, and deletes data across its website and mobile apps.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>

        <div className="prose prose-zinc max-w-none text-muted-foreground dark:prose-invert">
          <p className="mb-6">Effective and last updated: August 9, 2026</p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">1. Scope</h2>
          <p className="mb-4">
            This Privacy Policy explains how MathSolver (&quot;MathSolver,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) handles information when you use the math-solver.io website or the MathSolver iOS or Android app (together, the &quot;Service&quot;). It also explains your privacy choices and how to request deletion.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">2. Information We Collect</h2>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li><strong>Math content you submit:</strong> Text, equations, handwriting, answer choices, and images you choose to submit. This content is required to answer that request, but you can use the core solver without an account.</li>
            <li><strong>Optional account data:</strong> If you create an account, we receive a Firebase user identifier and email address. Google sign-in on the website can also provide basic profile information such as your name.</li>
            <li><strong>Contact data:</strong> If you use our contact form, we collect the first name, email address, and message you provide and forward them to a private Telegram chat so we can review and respond.</li>
            <li><strong>Notebook and learning data:</strong> Signed-out chats and progress are stored locally. If you sign in, chat text, extracted OCR text, solutions, generated practice tests, and practice-attempt results can be stored in your private cloud notebook so they can sync across devices. Uploaded image previews remain local in the current sync version.</li>
            <li><strong>Visual lesson data:</strong> If a verified account requests a visual lesson, we process the selected problem and completed solution to plan, review, narrate, and render it. We keep account-level job and daily allowance records to deliver the lesson and enforce the limit of 10 video generations per day.</li>
            <li><strong>Optional notification data:</strong> If you choose video-ready notifications, we store a device notification token, platform, and app version. The notification does not contain your math problem or solution.</li>
            <li><strong>Optional analytics:</strong> With your consent, we collect product interaction data such as pages or learning features used, app version, and general device information. Mobile analytics are off by default and can be changed in the app. We do not put math content, uploaded images, email addresses, or notebook identifiers in MathSolver analytics events.</li>
            <li><strong>Security and technical data:</strong> Our systems and service providers can process IP address, browser or operating-system type, app version, request timing, and device or installation identifiers used for authentication, App Check, fraud prevention, diagnostics, and service reliability.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">3. How We Use Information</h2>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Provide OCR, solutions, work checking, practice, and visual lessons.</li>
            <li>Authenticate optional accounts and synchronize private notebook data.</li>
            <li>Send a video-ready notification only after you choose to enable it.</li>
            <li>Maintain security, prevent abuse, diagnose failures, and protect reliability.</li>
            <li>Measure and improve the Service when you have consented to analytics.</li>
            <li>Respond to support, privacy, and account-deletion requests.</li>
          </ul>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">4. Service Providers and Data Sharing</h2>
          <p className="mb-4">
            We share information only as needed with processors that operate the Service. These include Google Gemini for AI math processing, OCR, lesson planning, narration, and quality review; Google Firebase Authentication, Cloud Firestore, Firebase Cloud Messaging, and App Check for optional accounts, private sync, notifications, and app integrity; Google Cloud Run, Cloud Tasks, and private Cloud Storage for rendering and temporary playback; Telegram for private contact-form delivery; Cloudflare Turnstile for website abuse protection; Google Analytics for consented analytics; and Pressroom for public blog content.
          </p>
          <p className="mb-4">
            Submitted math text and images are sent to Google&apos;s AI service to process your request. Google may retain API inputs and outputs for a limited period for abuse monitoring under its applicable service terms. We do not sell personal data, use cross-app advertising trackers, or share data for targeted advertising. MathSolver has no ads at launch.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">5. Cookies and Similar Technologies</h2>
          <p className="mb-4">
            The website uses local storage and cookies for core settings, optional account sessions, security, and consented analytics. You can refuse non-essential analytics through the consent choice and browser settings. The mobile app does not enable analytics unless you opt in.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">6. Retention</h2>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Guest chats and learning progress remain on the device until you delete them or clear app/browser data.</li>
            <li>Account and synced notebook data remain until you delete individual content or your account.</li>
            <li>Private visual-lesson clips, captions, posters, and manifests are kept for up to 14 days and can be deleted sooner from the app.</li>
            <li>Notification registrations remain until disabled, replaced, expired, or removed with account deletion.</li>
            <li>Security, diagnostic, and analytics records are kept only as needed for their stated purpose and according to the relevant provider settings.</li>
          </ul>
          <p className="mb-4">We may retain limited records when reasonably necessary to meet legal obligations, resolve disputes, prevent fraud or abuse, or protect the Service.</p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">7. Security and International Processing</h2>
          <p className="mb-4">
            We use HTTPS/TLS in transit, authenticated access controls, verified-account rules, and private storage for account data and visual lessons. No internet service is completely secure. Our providers may process data in countries other than your own under their applicable contractual and legal safeguards.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">8. Students and Schools</h2>
          <p className="mb-4">
            MathSolver is an educational service for students and general learners. We do not ask for a date of birth, and the core solver works without an account. Schools, families, and learners should use the Service consistently with the rules that apply to them. Contact us if you believe personal information should be reviewed or deleted.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">9. Your Choices and Rights</h2>
          <p className="mb-4">
            You may use the core solver without an account. You can decline notifications, disable them later in system settings, opt in or out of mobile analytics, and delete individual chats or private videos. Depending on your location, you may also have rights to access, correct, export, object to, restrict, or delete personal data. Email us to exercise a right; we may need to verify that the request relates to your account.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">10. Account and Data Deletion</h2>
          <p className="mb-4">
            A signed-in mobile user can permanently delete their account and associated cloud data from the Profile screen. This removes the Firebase account, synced notebook data, private video jobs and files, registered notification devices, and local app data on that device. If you cannot access the app, follow the instructions on our{" "}
            <Link className="text-foreground underline" href="/account-deletion">account deletion page</Link>. Never send us your password.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">11. Changes to This Policy</h2>
          <p className="mb-4">We may update this policy as the Service or legal requirements change. We will post the revised policy here, update its effective date, and provide additional notice when required.</p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">12. Contact</h2>
          <p className="mb-4">
            For privacy questions or requests, use our <Link href="/contact" className="text-foreground underline">contact form</Link> or email{" "}<a className="text-foreground underline" href="mailto:support@math-solver.io">support@math-solver.io</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

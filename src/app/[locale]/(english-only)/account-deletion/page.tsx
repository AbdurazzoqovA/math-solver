import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Delete Your Account and Data | MathSolver",
  description: "Instructions for permanently deleting a MathSolver account and associated data.",
  alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight">Delete your account and data</h1>
        <p className="mb-8 text-muted-foreground">MathSolver lets you permanently delete your account and associated data. This action cannot be undone.</p>

        <div className="prose prose-zinc max-w-none text-muted-foreground dark:prose-invert">
          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">Delete from the mobile app</h2>
          <ol className="mb-4 list-decimal space-y-2 pl-6">
            <li>Open MathSolver and sign in to the account you want to delete.</li>
            <li>Open <strong>Profile</strong>.</li>
            <li>Select <strong>Delete account and data</strong>.</li>
            <li>Review the warning, confirm, and complete any identity check shown.</li>
          </ol>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">If you cannot access the app</h2>
          <p className="mb-4">
            Email{" "}<a className="text-foreground underline" href="mailto:support@math-solver.io?subject=Delete%20my%20MathSolver%20account">support@math-solver.io</a>{" "}from the email address associated with the account. Use the subject &quot;Delete my MathSolver account.&quot; We may ask you to verify account ownership. Do not send your password, authentication code, or API key.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">Data that is deleted</h2>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Your Firebase Authentication account and account identifier.</li>
            <li>Your synced notebook, chats, solutions, practice data, and learning history.</li>
            <li>Your private visual-lesson jobs, generated files, and allowance records.</li>
            <li>Your registered devices and notification tokens.</li>
          </ul>
          <p className="mb-4">
            The in-app flow also removes MathSolver&apos;s locally saved learning data and offline video copies from that device. If you request deletion by email, remove remaining local data by deleting the app or clearing its storage on each device.
          </p>

          <h2 className="mt-8 mb-4 text-xl font-semibold text-foreground">Limited retention</h2>
          <p className="mb-4">
            We may retain limited records only where reasonably necessary for legal obligations, security, fraud or abuse prevention, or dispute resolution. Private generated video media otherwise expires within 14 days and can be removed sooner through account deletion.
          </p>

          <p className="mt-8 mb-4">
            For more detail, read the{" "}<Link className="text-foreground underline" href="/privacy">MathSolver Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

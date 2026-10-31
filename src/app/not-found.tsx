import Link from "next/link";

// Unknown paths can fail before a locale layout emits document markup.
export default function NotFound() {
  return (
    <html lang="en" dir="ltr"><body>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p>This page does not exist.</p>
        <Link href="/" className="text-primary-700 underline">Go to MathSolver home</Link>
      </main>
    </body></html>
  );
}

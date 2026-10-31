import Link from "next/link";

export default function NotFound() {
  return <div lang="en" dir="ltr" className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
    <h1 className="text-3xl font-semibold">Page not found</h1>
    <p>This page does not exist.</p>
    <Link href="/" className="text-primary-700 underline">Go to MathSolver home</Link>
  </div>;
}

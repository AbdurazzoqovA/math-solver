import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calculator, Camera, BookOpen, LineChart, Zap, MessageCircle, ScanLine, CircleCheckBig, Clapperboard } from "lucide-react";
import MobileAppLinks from "@/components/marketing/MobileAppLinks";
import { MOBILE_APP_STORES } from "@/lib/mobile-apps";

const popularCalculators = [
  {
    name: "Solve for X",
    href: "/calculator/solve-for-x",
    detail: "Linear and multistep equations",
  },
  {
    name: "Graphing",
    href: "/calculator/graphing",
    detail: "Plot and compare functions online",
  },
  {
    name: "Quadratic equations",
    href: "/calculator/quadratic-equation",
    detail: "Roots, discriminant, and formula",
  },
  {
    name: "Factoring",
    href: "/calculator/factoring",
    detail: "GCF, trinomials, and special products",
  },
  {
    name: "Fractions",
    href: "/calculator/fraction",
    detail: "Add, subtract, multiply, and divide",
  },
  {
    name: "Systems of equations",
    href: "/calculator/systems-of-equations",
    detail: "Substitution and elimination",
  },
  {
    name: "Inequalities",
    href: "/calculator/inequalities",
    detail: "Intervals and sign changes",
  },
  {
    name: "Logarithms",
    href: "/calculator/logarithms",
    detail: "Evaluate, expand, and solve logs",
  },
  {
    name: "Derivatives",
    href: "/calculator/derivative",
    detail: "Power, product, quotient, and chain rules",
  },
  {
    name: "Integrals",
    href: "/calculator/integral",
    detail: "Antiderivatives and integration methods",
  },
  {
    name: "Matrices",
    href: "/calculator/matrix",
    detail: "Operations, transpose, and row reduction",
  },
  {
    name: "Determinants",
    href: "/calculator/determinant",
    detail: "2 by 2 and larger square matrices",
  },
  {
    name: "Trig identities",
    href: "/calculator/trig-identities",
    detail: "Verify and simplify exact identities",
  },
  {
    name: "Standard deviation",
    href: "/calculator/standard-deviation",
    detail: "Sample and population spread",
  },
];

const faqLinkClass =
  "font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-600 dark:text-primary-300 dark:decoration-primary-700";

// Single source of truth for the FAQ block. No FAQPage JSON-LD by design:
// Google retired FAQ rich results, so visible FAQs carry the value. See [[tech-and-ops]].
const faqItems: { question: string; answer: React.ReactNode }[] = [
  {
    question: "What is MathSolver?",
    answer:
      "MathSolver is a free AI-powered math solver that delivers step-by-step solutions for algebra, calculus, geometry, trigonometry, statistics, and more. Simply type an equation or upload a photo of your math problem to get an instant, detailed breakdown.",
  },
  {
    question: "Can MathSolver solve math from a photo?",
    answer:
      "Yes. Upload a picture of any handwritten or printed problem and MathSolver will read it, extract the equation, and return a full step-by-step solution automatically.",
  },
  {
    question: "What subjects does MathSolver cover?",
    answer:
      "It covers arithmetic, pre-algebra, algebra, geometry, trigonometry, precalculus, calculus, linear algebra, differential equations, statistics, probability, plus physics and chemistry questions.",
  },
  {
    question: "Is MathSolver completely free?",
    answer:
      "Yes. You can solve unlimited problems, view every step-by-step explanation, and generate practice quizzes, all at no cost, with no account required.",
  },
  {
    question: "Can teachers tell if I used an AI math solver?",
    answer: (
      <>
        The numbers and steps are just math, so there is nothing to detect. What teachers and AI checkers look at is the written explanation. If you paste AI-generated text into a report or homework write-up, it can be flagged. Use the steps to learn the method, then write the explanation in your own words. If you want to be sure before you submit, run the text through an{" "}
        <a href="https://detecting-ai.com/" className={faqLinkClass}>
          AI detector
        </a>{" "}
        first.
      </>
    ),
  },
  {
    question: "How accurate is the AI math solver?",
    answer:
      "MathSolver uses advanced AI models trained on millions of math problems. While it handles most problems with high accuracy, we always recommend double-checking critical calculations, especially for exams or professional work.",
  },
  {
    question: "Does MathSolver have iPhone and Android apps?",
    answer: (
      <>
        Yes. MathSolver is available on the{" "}
        <a href={MOBILE_APP_STORES.ios.url} target="_blank" rel="noopener noreferrer" className={faqLinkClass}>
          App Store
        </a>{" "}
        and{" "}
        <a href={MOBILE_APP_STORES.android.url} target="_blank" rel="noopener noreferrer" className={faqLinkClass}>
          Google Play
        </a>.
        You can scan problems directly with your camera, check handwritten work, practice, and save video lessons for offline viewing. The browser version also continues to work on phones and tablets without installing anything.
      </>
    ),
  },
];

export default function SeoSections() {
  return (
    <div className="w-full px-4 relative z-10 mt-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      
      {/* Block 1: What makes MathSolver different */}
      <div className="flex justify-center">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Solve Any Math Problem in Seconds
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>Struggling with a tough equation? MathSolver is a free online math solver that turns complex problems into clear, step-by-step answers. Just type your equation, paste a word problem, or snap a photo of your homework and our AI does the rest.</p>
            <p>From basic algebra and geometry to advanced calculus and statistics, MathSolver doesn&apos;t just give you the final answer. It shows you exactly how to get there, explaining every step along the way so you can learn the method and apply it on your own next time.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
              Popular math calculators
            </h2>
            <p className="mt-3 text-gray-500 dark:text-zinc-400 leading-relaxed">
              Start with the exact skill you are studying. Each calculator
              keeps the full explanation free.
            </p>
          </div>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
            {popularCalculators.map((calculator) => (
              <Link
                key={calculator.href}
                href={calculator.href}
                className="group flex items-center justify-between gap-5 rounded-xl border border-black/5 bg-white/60 px-5 py-4 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/70 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
              >
                <span>
                  <span className="block font-medium text-foreground">
                    {calculator.name}
                  </span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-zinc-400">
                    {calculator.detail}
                  </span>
                </span>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
          <Link
            href="/calculator"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-primary-700 transition-colors hover:bg-primary-50 active:translate-y-px dark:text-primary-300 dark:hover:bg-primary-950/30"
          >
            Browse all calculators
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Mobile app download section */}
      <div className="flex justify-center mt-16">
        <section
          aria-labelledby="mobile-app-title"
          className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-white to-indigo-50 p-6 shadow-sm dark:border-primary-900/60 dark:from-primary-950/35 dark:via-zinc-900/70 dark:to-indigo-950/30 sm:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
                MathSolver mobile apps
              </p>
              <h2 id="mobile-app-title" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Your free math tutor, wherever homework happens
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-zinc-300 sm:text-lg">
                Scan a problem from your camera, check your handwritten work, and keep learning with practice and private video explanations. Core solving works without an account, and there is no subscription.
              </p>

              <ul className="mt-7 grid gap-3 text-sm text-foreground sm:grid-cols-3">
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <ScanLine className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  Scan any problem
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <CircleCheckBig className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  Check your work
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <Clapperboard className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  Watch visual lessons
                </li>
              </ul>

              <MobileAppLinks placement="homepage_mobile_section" className="mt-8 items-start" />
            </div>

            <div className="mx-auto w-full max-w-[330px] lg:max-w-[360px]">
              <Image
                src="/mobile-app-preview.webp"
                alt="MathSolver mobile app showing camera, photo, typing, and Check My Work options"
                width={560}
                height={1120}
                sizes="(max-width: 1024px) 330px, 360px"
                className="h-auto w-full rounded-[2rem] border border-black/5 shadow-2xl shadow-primary-950/15 dark:border-white/10"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Block 2: Core Features */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Everything You Need to Solve Math
          </h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Calculator className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Step-by-Step Solutions</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                No more guessing where you went wrong. MathSolver shows each calculation as a separate, numbered step with a plain-language explanation. You&apos;ll see exactly which formula was applied and why, whether it&apos;s factoring a quadratic, computing a derivative, or simplifying a fraction.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Camera className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Photo Math Solver</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Take a picture of any handwritten or printed problem and drop it into MathSolver. Our image recognition reads the equation, converts it to text, and solves it on the spot. Perfect for quickly working through textbook exercises or checking your handwritten work.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <BookOpen className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Practice Quizzes</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Reading solutions is one thing, but testing yourself is where real learning happens. Generate a custom quiz on any topic and difficulty level to check whether you truly understand the material before exam day.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
                <LineChart className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Graphing Calculator</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Plot functions, find intersections, and see how equations behave, all inside your browser. MathSolver&apos;s graphing tool lets you overlay multiple functions on one set of axes so you can compare, analyze, and understand relationships visually.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 3: How It Works */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            How the Math Solver Works
          </h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">1. Enter Your Problem</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Type an equation, describe a word problem in plain English, or upload a photo. Whatever is easiest for you.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">2. Get a Step-by-Step Solution</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Our AI analyzes the problem, solves it, and returns each step with a clear explanation so you understand the &quot;why&quot;, not just the &quot;what&quot;.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">3. Ask Follow-Ups</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Didn&apos;t catch a step? Ask a follow-up question right in the chat. MathSolver remembers the context and explains further, like having a tutor on call.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 4: Subjects Covered */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Subjects MathSolver Can Help With
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>MathSolver covers every major math topic: arithmetic, pre-algebra, algebra I &amp; II, geometry, trigonometry, precalculus, calculus (AP AB/BC and beyond), differential equations, linear algebra, probability, and statistics. It also handles common STEM crossover questions in physics and chemistry.</p>
            <p>No matter how specific the problem is, whether it&apos;s a system of three equations, a polar-to-rectangular conversion, or a hypothesis test, MathSolver can break it down and walk you through the solution.</p>
          </div>
        </div>
      </div>

      {/* Block 5: FAQ */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 flex flex-col gap-12">
            {faqItems.map((item) => (
              <div key={item.question} className="flex flex-col gap-3">
                <h3 className="text-xl font-normal text-foreground dark:text-gray-200">{item.question}</h3>
                <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

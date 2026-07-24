import Link from "next/link";
import { ArrowRight, BookOpenCheck, TriangleAlert } from "lucide-react";
import type { CalculatorDefinition } from "@/lib/calculators";
import { getRelatedCalculators } from "@/lib/calculators";
import CalculatorExperience from "./CalculatorExperience";
import MathFormula from "./MathFormula";

export default function CalculatorPage({
  calculator,
}: {
  calculator: CalculatorDefinition;
}) {
  const relatedCalculators = getRelatedCalculators(calculator);
  const isGraphingCalculator = calculator.tool?.kind === "graphing";

  return (
    <CalculatorExperience
      calculator={{
        slug: calculator.slug,
        name: calculator.name,
        heading: calculator.heading,
        heroDescription: calculator.heroDescription,
        placeholder: calculator.placeholder,
        inputHint: calculator.inputHint,
        tool: calculator.tool,
        examples: calculator.examples,
      }}
    >
      <div className="mt-20 space-y-20 sm:mt-24">
          <section className="grid gap-8 border-t border-black/8 pt-12 dark:border-white/10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16">
            <div>
              <BookOpenCheck
                className="mb-5 h-7 w-7 text-primary-600 dark:text-primary-400"
                aria-hidden="true"
              />
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {calculator.overview.heading}
              </h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {calculator.overview.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="how-to-use-heading">
            <h2
              id="how-to-use-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              How to use the {calculator.name.toLowerCase()}
            </h2>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-black/8 bg-card p-6 dark:border-white/10">
                <h3 className="text-lg font-semibold text-foreground">
                  {isGraphingCalculator
                    ? "Enter one or more functions"
                    : "Enter the problem as written"}
                </h3>
                <p className="mt-2 leading-7 text-muted-foreground">
                  {isGraphingCalculator
                    ? "Use one row for each function of x. Add, hide, or remove curves when you want to compare their shapes."
                    : "Type or paste the full expression. You can also upload a clear photo or PDF and check the extracted text before solving."}
                </p>
              </div>
              <div className="rounded-2xl border border-black/8 bg-card p-6 dark:border-white/10">
                <h3 className="text-lg font-semibold text-foreground">
                  {isGraphingCalculator
                    ? "Set a useful viewing window"
                    : "Read the working, not only the answer"}
                </h3>
                <p className="mt-2 leading-7 text-muted-foreground">
                  {isGraphingCalculator
                    ? "Pan, zoom, or enter axis limits so roots, turning points, and asymptotes are not hidden outside the frame."
                    : "Each transformation is separated and explained so you can compare it with your own method."}
                </p>
              </div>
              <div className="rounded-2xl border border-black/8 bg-primary-50/65 p-6 dark:border-primary-900/60 dark:bg-primary-950/20 md:col-span-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {isGraphingCalculator
                    ? "Ask about the visible features"
                    : "Ask about any step"}
                </h3>
                <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
                  {isGraphingCalculator
                    ? "Send the visible functions to the tutor for help with intercepts, domain, range, transformations, or asymptotes."
                    : "Continue in the same solution to request another method, check a restriction, or ask why a rule applies."}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary-200 bg-primary-50/70 dark:border-primary-900/70 dark:bg-primary-950/25">
            <div className="grid lg:grid-cols-[0.7fr_1.3fr]">
              <div className="p-6 sm:p-8">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {calculator.formula.title}
                </h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {calculator.formula.explanation}
                </p>
              </div>
              <div className="flex min-h-40 items-center justify-center border-t border-primary-200 bg-white/70 p-6 text-lg dark:border-primary-900/70 dark:bg-zinc-950/35 sm:text-xl lg:border-l lg:border-t-0">
                <MathFormula expression={calculator.formula.latex} />
              </div>
            </div>
          </section>

          <section aria-labelledby="methods-heading">
            <h2
              id="methods-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              A reliable way to work through it
            </h2>
            <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {calculator.methods.map((method, index) => (
                <div
                  key={method.title}
                  className={
                    index === calculator.methods.length - 1
                      ? "md:col-span-2 md:max-w-2xl"
                      : ""
                  }
                >
                  <h3 className="text-lg font-semibold text-foreground">
                    {method.title}
                  </h3>
                  <p className="mt-2 leading-7 text-muted-foreground">
                    {method.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="worked-example-heading"
            className="grid gap-8 rounded-2xl border border-black/8 bg-card p-6 dark:border-white/10 sm:p-8 lg:grid-cols-[0.62fr_1.38fr] lg:gap-12"
          >
            <div>
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                Worked example
              </p>
              <h2
                id="worked-example-heading"
                className="mt-3 text-3xl font-bold tracking-tight text-foreground"
              >
                {calculator.workedExample.problem}
              </h2>
            </div>
            <div>
              <div className="space-y-6">
                {calculator.workedExample.steps.map((step) => (
                  <div
                    key={`${step.latex}-${step.note}`}
                    className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6"
                  >
                    <div className="rounded-xl bg-muted px-4 py-3 text-center">
                      <MathFormula expression={step.latex} display={false} />
                    </div>
                    <p className="leading-7 text-muted-foreground">{step.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-7 rounded-xl bg-primary-50 px-5 py-4 font-medium leading-7 text-primary-950 dark:bg-primary-950/45 dark:text-primary-100">
                {calculator.workedExample.answer}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="mistakes-heading"
            className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14"
          >
            <div>
              <TriangleAlert
                className="mb-5 h-7 w-7 text-primary-600 dark:text-primary-400"
                aria-hidden="true"
              />
              <h2
                id="mistakes-heading"
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                Common mistakes to check
              </h2>
            </div>
            <div className="space-y-6">
              {calculator.mistakes.map((mistake) => (
                <div key={mistake.title}>
                  <h3 className="font-semibold text-foreground">
                    {mistake.title}
                  </h3>
                  <p className="mt-1 leading-7 text-muted-foreground">
                    {mistake.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              Related calculators
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {relatedCalculators.map((related) => (
                <Link
                  key={related.slug}
                  href={`/calculator/${related.slug}`}
                  className="group flex items-center justify-between gap-5 rounded-2xl border border-black/8 bg-card px-5 py-4 transition-colors hover:border-primary-300 hover:bg-primary-50/60 active:translate-y-px dark:border-white/10 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
                >
                  <span>
                    <span className="block font-semibold text-foreground">
                      {related.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {related.heroDescription}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="faq-heading" className="max-w-4xl">
            <h2
              id="faq-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              Questions students ask
            </h2>
            <div className="mt-7 space-y-3">
              {calculator.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-black/8 bg-card open:border-primary-200 open:bg-primary-50/40 dark:border-white/10 dark:open:border-primary-900 dark:open:bg-primary-950/15"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-foreground marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span
                        aria-hidden="true"
                        className="text-xl font-normal text-muted-foreground transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="px-5 pb-5 leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl border border-black/8 bg-muted/70 px-5 py-4 text-sm leading-6 text-muted-foreground dark:border-white/10">
            Use the steps to learn or check your work. MathSolver can make
            mistakes, so confirm important calculations and assignment
            requirements.
          </aside>
      </div>
    </CalculatorExperience>
  );
}

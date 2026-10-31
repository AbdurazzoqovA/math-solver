import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ChartBar,
  ChartSpline,
  FunctionSquare,
  Percent,
  Sigma,
  Table2,
  Triangle,
} from "lucide-react";
import {
  calculatorCategories,
  calculatorDefinitions,
  type CalculatorCategory,
} from "@/lib/calculators";

const BASE_URL = "https://math-solver.io";

export const metadata: Metadata = {
  title: "Free Math Calculators with Steps | MathSolver",
  description:
    "Use free algebra, calculus, trigonometry, statistics, matrix, arithmetic, and graphing calculators. Plot functions or get clear step-by-step solutions.",
  keywords: [
    "math calculators",
    "free calculator with steps",
    "online graphing calculator",
    "algebra calculator",
    "statistics calculator",
  ],
  alternates: {
    canonical: "/calculator",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/calculator",
    siteName: "MathSolver",
    locale: "en_US",
    title: "Free Math Calculators with Steps",
    description:
      "Choose a calculator, enter your problem, and get a free step-by-step solution.",
    images: [
      {
        url: "/calculator/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MathSolver calculator collection with step-by-step solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Math Calculators with Steps",
    description:
      "Choose a calculator, enter your problem, and get a free step-by-step solution.",
    images: ["/calculator/opengraph-image"],
  },
};

const categoryCopy: Record<CalculatorCategory, string> = {
  "General Math":
    "Work with fractions, percentages, common factors, common multiples, and multi-step word problems.",
  Algebra:
    "Solve equations, simplify expressions, factor polynomials, and work through the methods used in Algebra I and II.",
  Precalculus:
    "Review the polynomial, rational, exponential, and logarithmic skills that carry into trigonometry and calculus.",
  Trigonometry:
    "Verify identities, use exact unit-circle values, and solve triangles with the Law of Cosines.",
  Calculus:
    "Work through derivatives, integrals, limits, multivariable differentiation, and infinite series with complete steps.",
  "Linear Algebra":
    "Calculate matrix operations, determinants, inverses, eigenvalues, and vector products with dimension checks and complete steps.",
  Statistics:
    "Summarize data, measure spread, standardize values, calculate probabilities, and count possible outcomes.",
  Graphing:
    "Plot and compare functions on an interactive coordinate plane, then ask for a step-by-step feature analysis.",
};

const categoryIcons: Record<CalculatorCategory, typeof Calculator> = {
  "General Math": Percent,
  Algebra: Calculator,
  Precalculus: FunctionSquare,
  Trigonometry: Triangle,
  Calculus: Sigma,
  "Linear Algebra": Table2,
  Statistics: ChartBar,
  Graphing: ChartSpline,
};

export default function CalculatorHubPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/calculator#webpage`,
        url: `${BASE_URL}/calculator`,
        name: "Free Math Calculators with Steps",
        description: metadata.description,
        isPartOf: { "@id": `${BASE_URL}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: calculatorDefinitions.length,
          itemListElement: calculatorDefinitions.map((calculator, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: calculator.name,
            url: `${BASE_URL}/calculator/${calculator.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: BASE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${BASE_URL}/calculator`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="w-full bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-24 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Link className="transition-colors hover:text-foreground" href="/">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-foreground">
              Calculators
            </span>
          </nav>

          <header className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Free math calculators with steps
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Pick the skill you are working on, enter the problem, and follow
              the complete solution for free.
            </p>
          </header>

          <div className="mt-16 space-y-20">
            {calculatorCategories.map((category) => {
              const items = calculatorDefinitions.filter(
                (calculator) => calculator.category === category,
              );
              const CategoryIcon = categoryIcons[category];
              const categoryHeadingId = `${category
                .toLowerCase()
                .replace(/\s+/g, "-")}-heading`;

              return (
                <section key={category} aria-labelledby={categoryHeadingId}>
                  <div className="max-w-3xl">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      <CategoryIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2
                      id={categoryHeadingId}
                      className="text-3xl font-bold tracking-tight text-foreground"
                    >
                      {category}
                    </h2>
                    <p className="mt-3 leading-7 text-muted-foreground">
                      {categoryCopy[category]}
                    </p>
                  </div>

                  <div className="mt-8 grid gap-3 md:grid-cols-2">
                    {items.map((calculator, index) => (
                      <Link
                        key={calculator.slug}
                        href={`/calculator/${calculator.slug}`}
                        className={`group flex items-start justify-between gap-5 rounded-2xl border border-black/8 bg-card p-5 transition-colors hover:border-primary-300 hover:bg-primary-50/60 active:translate-y-px dark:border-white/10 dark:hover:border-primary-800 dark:hover:bg-primary-950/20 ${
                          index === 0 && items.length % 2 === 1
                            ? "md:col-span-2"
                            : ""
                        }`}
                      >
                        <span>
                          <span className="block text-lg font-semibold text-foreground">
                            {calculator.name}
                          </span>
                          <span className="mt-2 block leading-7 text-muted-foreground">
                            {calculator.heroDescription}
                          </span>
                        </span>
                        <ArrowRight
                          className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="mt-20 rounded-2xl border border-black/8 bg-muted/70 px-5 py-4 text-sm leading-6 text-muted-foreground dark:border-white/10">
            These calculators explain the work, but important calculations
            should still be checked against your course instructions.
          </aside>
        </div>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalculatorPage from "@/components/calculators/CalculatorPage";
import {
  calculatorDefinitions,
  getCalculator,
} from "@/lib/calculators";

const BASE_URL = "https://math-solver.io";

export const dynamicParams = false;

export function generateStaticParams() {
  return calculatorDefinitions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const calculator = getCalculator(slug);

  if (!calculator) {
    return {};
  }

  const path = `/calculator/${calculator.slug}`;
  const imageUrl = `${path}/opengraph-image`;

  return {
    title: `${calculator.seoTitle} | MathSolver`,
    description: calculator.description,
    keywords: calculator.keywords,
    alternates: {
      canonical: path,
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
      url: path,
      siteName: "MathSolver",
      locale: "en_US",
      title: calculator.seoTitle,
      description: calculator.description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${calculator.name} with free step-by-step solutions`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: calculator.seoTitle,
      description: calculator.description,
      images: [imageUrl],
    },
  };
}

export default async function CalculatorRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calculator = getCalculator(slug);

  if (!calculator) {
    notFound();
  }

  const url = `${BASE_URL}/calculator/${calculator.slug}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const applicationId = `${url}#calculator`;
  const featureList =
    calculator.tool?.kind === "graphing"
      ? [
          "Plot up to four functions",
          "Pan and zoom controls",
          "Editable coordinate window",
          "Coordinate tracing",
          "Step-by-step graph explanations",
        ]
      : [
          "Step-by-step solutions",
          "Photo and PDF input",
          "Follow-up questions",
          ...calculator.methods.map((method) => method.title),
        ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: calculator.seoTitle,
        description: calculator.description,
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": applicationId },
        isPartOf: { "@id": `${BASE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
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
          {
            "@type": "ListItem",
            position: 3,
            name: calculator.name,
            item: url,
          },
        ],
      },
      {
        "@type": "WebApplication",
        "@id": applicationId,
        name: calculator.name,
        url,
        description: calculator.description,
        applicationCategory: "EducationalApplication",
        applicationSubCategory: `${calculator.category} calculator`,
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript enabled",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList,
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
      <CalculatorPage calculator={calculator} />
    </>
  );
}

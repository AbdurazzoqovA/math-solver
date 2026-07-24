import type { MetadataRoute } from "next";
import { calculatorDefinitions } from "@/lib/calculators";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://math-solver.io";
  const calculatorReleaseDate = new Date("2026-07-24T00:00:00.000Z");

  return [
    {
      url: baseUrl,
    },
    {
      url: `${baseUrl}/privacy`,
    },
    {
      url: `${baseUrl}/terms`,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified: calculatorReleaseDate,
    },
    ...calculatorDefinitions.map(({ slug }) => ({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: calculatorReleaseDate,
    })),
  ];
}

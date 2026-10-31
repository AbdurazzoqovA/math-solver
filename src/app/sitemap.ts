import type { MetadataRoute } from "next";
import { calculatorDefinitions } from "@/lib/calculators";
import { getAllPosts } from "@/lib/pressroom";
import { LANGUAGES } from "@/lib/i18n/locales";
import { languageAlternates } from "@/lib/i18n/paths";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://math-solver.io";
  const calculatorReleaseDate = new Date("2026-07-24T00:00:00.000Z");
  let blogPosts: Awaited<ReturnType<typeof getAllPosts>> = [];

  try {
    blogPosts = await getAllPosts();
  } catch (error) {
    console.error("Failed to add Pressroom articles to the sitemap:", error);
  }

  return [
    ...LANGUAGES.map(({ code }) => ({
      url: code === "en" ? baseUrl : `${baseUrl}/${code}`,
      lastModified: new Date("2026-10-07T00:00:00.000Z"),
      alternates: { languages: languageAlternates() },
    })),
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date("2026-10-31T00:00:00.000Z"),
    },
    {
      url: `${baseUrl}/privacy`,
    },
    {
      url: `${baseUrl}/terms`,
    },
    {
      url: `${baseUrl}/contact`,
    },
    {
      url: `${baseUrl}/account-deletion`,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified: calculatorReleaseDate,
    },
    {
      url: `${baseUrl}/blog`,
    },
    ...calculatorDefinitions.map(({ slug }) => ({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: calculatorReleaseDate,
    })),
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      ...(post.publishedAt
        ? { lastModified: new Date(post.publishedAt) }
        : {}),
    })),
  ];
}

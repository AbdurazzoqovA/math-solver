import type { MetadataRoute } from "next";
import { calculatorDefinitions } from "@/lib/calculators";
import { getAllPosts } from "@/lib/pressroom";

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

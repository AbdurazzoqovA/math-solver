import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Clock3,
} from "lucide-react";
import {
  formatPostDate,
  getPosts,
  parseBlogPage,
} from "@/lib/pressroom";

const POSTS_PER_PAGE = 9;

export const dynamic = "force-dynamic";

type BlogPageProps = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const page = parseBlogPage((await searchParams).page);
  const title =
    page > 1
      ? `MathSolver Blog — Page ${page}`
      : "MathSolver Blog — Math Guides and Learning Tips";
  const description =
    "Clear math guides, study strategies, calculator explainers, and practical learning advice from MathSolver.";

  return {
    title,
    description,
    alternates: {
      canonical: page > 1 ? `/blog?page=${page}` : "/blog",
    },
    openGraph: {
      type: "website",
      url: page > 1 ? `/blog?page=${page}` : "/blog",
      siteName: "MathSolver",
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export default async function BlogPage({
  searchParams,
}: BlogPageProps) {
  const page = parseBlogPage((await searchParams).page);
  const { posts, pagination } = await getPosts(page, POSTS_PER_PAGE);

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    notFound();
  }

  const visiblePages = getVisiblePages(page, pagination.totalPages);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": "https://math-solver.io/blog#blog",
    url: "https://math-solver.io/blog",
    name: "MathSolver Blog",
    description:
      "Math guides, study strategies, calculator explainers, and learning advice.",
    isPartOf: { "@id": "https://math-solver.io/#website" },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `https://math-solver.io/blog/${post.slug}`,
      ...(post.publishedAt
        ? { datePublished: post.publishedAt }
        : {}),
      ...(post.coverImageUrl
        ? { image: post.coverImageUrl }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="min-h-full bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to solver
          </Link>

          <header className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Learn with MathSolver
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              MathSolver Blog
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Clear math guides, calculator explainers, and practical study
              strategies that help you understand the method—not just the
              answer.
            </p>
          </header>

          {posts.length > 0 ? (
            <section
              aria-label="Blog articles"
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {posts.map((post) => {
                const publishedDate = formatPostDate(post.publishedAt);
                return (
                  <article
                    key={post.slug}
                    className="group overflow-hidden rounded-3xl border border-black/8 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-950/5 dark:border-white/8 dark:bg-zinc-900 dark:hover:border-primary-800"
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                    >
                      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-50 to-indigo-100 dark:from-primary-950/70 dark:to-indigo-950/50">
                        {post.coverImageUrl ? (
                          // Pressroom cover hosts vary by article/site.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpenText
                              className="h-10 w-10 text-primary-400"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        {post.tags.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-950/45 dark:text-primary-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {post.title}
                        </h2>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs text-muted-foreground">
                          <span>
                            {publishedDate ?? "Recently published"}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {post.readingMinutes} min
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="mt-12 rounded-3xl border border-dashed border-black/10 px-6 py-20 text-center dark:border-white/10">
              <BookOpenText className="mx-auto h-10 w-10 text-primary-400" />
              <h2 className="mt-4 text-xl font-bold text-foreground">
                Articles are on the way
              </h2>
              <p className="mt-2 text-muted-foreground">
                Check back soon for new math guides and learning tips.
              </p>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <nav
              aria-label="Blog pagination"
              className="mt-12 flex flex-wrap items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link
                  href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Link>
              )}

              {visiblePages.map((visiblePage, index) => {
                const previousPage = visiblePages[index - 1];
                const showGap =
                  previousPage !== undefined &&
                  visiblePage - previousPage > 1;
                return (
                  <div key={visiblePage} className="contents">
                    {showGap && (
                      <span
                        className="px-1 text-muted-foreground"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    )}
                    <Link
                      href={
                        visiblePage === 1
                          ? "/blog"
                          : `/blog?page=${visiblePage}`
                      }
                      aria-current={
                        visiblePage === page ? "page" : undefined
                      }
                      className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors ${
                        visiblePage === page
                          ? "bg-primary-600 text-white"
                          : "border border-black/10 text-foreground hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      {visiblePage}
                    </Link>
                  </div>
                );
              })}

              {page < pagination.totalPages && (
                <Link
                  href={`/blog?page=${page + 1}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>
    </>
  );
}

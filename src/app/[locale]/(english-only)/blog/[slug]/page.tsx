import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
} from "lucide-react";
import {
  formatPostDate,
  getPost,
  type PressroomAuthor,
} from "@/lib/pressroom";

const BASE_URL = "https://math-solver.io";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      siteName: "MathSolver",
      title: post.metaTitle,
      description: post.metaDescription,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author.name] : undefined,
      tags: post.tags,
      images: post.coverImageUrl
        ? [
            {
              url: post.coverImageUrl,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: post.metaTitle,
      description: post.metaDescription,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

function AuthorBox({ author }: { author: PressroomAuthor }) {
  const initials = author.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const links = [
    { label: "Website", href: author.website },
    { label: "X", href: author.twitter },
    { label: "LinkedIn", href: author.linkedin },
  ].filter((link): link is { label: string; href: string } =>
    Boolean(link.href),
  );

  return (
    <aside className="mt-12 rounded-3xl border border-black/8 bg-zinc-50 p-5 sm:p-6 dark:border-white/8 dark:bg-zinc-900">
      <div className="flex items-start gap-4">
        {author.avatarUrl ? (
          // Pressroom avatar hosts vary by author/site.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/45 dark:text-primary-300">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bold text-foreground">{author.name}</p>
          {author.title && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {author.title}
            </p>
          )}
          {author.bio && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {author.bio}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default async function ArticlePage({
  params,
}: ArticlePageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const publishedDate = formatPostDate(post.publishedAt);
  const articleUrl = `${BASE_URL}/blog/${post.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    url: articleUrl,
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt ?? post.updatedAt,
    dateModified: post.updatedAt,
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.name,
          ...(post.author.website
            ? { url: post.author.website }
            : {}),
        }
      : {
          "@type": "Organization",
          name: "MathSolver",
          url: BASE_URL,
        },
    publisher: { "@id": `${BASE_URL}/#organization` },
    isPartOf: { "@id": `${BASE_URL}/blog#blog` },
    mainEntityOfPage: articleUrl,
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
        <article className="mx-auto w-full max-w-4xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All articles
          </Link>

          <header className="mt-10">
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/45 dark:text-primary-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {post.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {publishedDate && <time>{publishedDate}</time>}
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {post.readingMinutes} min read
              </span>
              {post.author && <span>By {post.author.name}</span>}
            </div>
          </header>

          {post.coverImageUrl && (
            <div className="mt-10 overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900">
              {/* Pressroom cover hosts vary by article/site. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImageUrl}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          )}

          <div
            className="post-body prose prose-lg mt-10 max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-a:text-primary-600 prose-a:decoration-primary-300 hover:prose-a:text-primary-700 dark:prose-a:text-primary-400 dark:hover:prose-a:text-primary-300"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {post.author && <AuthorBox author={post.author} />}

          <aside className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl bg-primary-600 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="text-xl font-bold">
                Ready to work through a problem?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-100">
                Get a free step-by-step solution, then practice the method.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Open MathSolver
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </article>
      </main>
    </>
  );
}

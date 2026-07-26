import "server-only";

const PRESSROOM_API_URL =
  process.env.PRESSROOM_API_URL?.trim() ||
  "https://press.roselapp.com";
const PRESSROOM_REVALIDATE_SECONDS = 300;

export type PressroomAuthor = {
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  website: string | null;
  twitter: string | null;
  linkedin: string | null;
};

export type PressroomPostCard = {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  tags: string[];
  publishedAt: string | null;
  readingMinutes: number;
  author: PressroomAuthor | null;
};

export type PressroomPost = PressroomPostCard & {
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
};

export type PressroomPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PressroomListResponse = {
  posts: PressroomPostCard[];
  pagination: PressroomPagination;
};

function getPressroomApiKey() {
  const apiKey = process.env.PRESSROOM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Pressroom is not configured.");
  }
  return apiKey;
}

async function pressroomFetch(path: string) {
  return fetch(`${PRESSROOM_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getPressroomApiKey()}`,
    },
    next: {
      revalidate: PRESSROOM_REVALIDATE_SECONDS,
    },
  });
}

function normalizePositiveInteger(
  value: number,
  fallback: number,
  maximum?: number,
) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Math.max(1, Math.trunc(value));
  return maximum ? Math.min(normalized, maximum) : normalized;
}

export function parseBlogPage(
  value: string | string[] | undefined,
): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return 1;
  return normalizePositiveInteger(Number(rawValue), 1);
}

export async function getPosts(
  page = 1,
  limit = 12,
): Promise<PressroomListResponse> {
  const normalizedPage = normalizePositiveInteger(page, 1);
  const normalizedLimit = normalizePositiveInteger(limit, 12, 50);
  const response = await pressroomFetch(
    `/api/v1/posts?page=${normalizedPage}&limit=${normalizedLimit}`,
  );

  if (!response.ok) {
    throw new Error(`Pressroom request failed (${response.status}).`);
  }

  const data = (await response.json()) as Partial<PressroomListResponse>;
  if (!Array.isArray(data.posts) || !data.pagination) {
    throw new Error("Pressroom returned an invalid list response.");
  }

  return data as PressroomListResponse;
}

export async function getAllPosts(): Promise<PressroomPostCard[]> {
  const firstPage = await getPosts(1, 50);
  const posts = [...firstPage.posts];

  for (
    let page = 2;
    page <= Math.min(firstPage.pagination.totalPages, 100);
    page += 1
  ) {
    const nextPage = await getPosts(page, 50);
    posts.push(...nextPage.posts);
  }

  return posts;
}

export async function getPost(
  slug: string,
): Promise<PressroomPost | null> {
  const response = await pressroomFetch(
    `/api/v1/posts/${encodeURIComponent(slug)}`,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Pressroom request failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    post?: PressroomPost;
  };
  if (!data.post) {
    throw new Error("Pressroom returned an invalid article response.");
  }

  return data.post;
}

export function formatPostDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

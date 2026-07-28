import "server-only";

import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import type {
  PlaybackVideoLessonManifest,
  PublicVideoJobSummary,
  StoredVideoLessonManifest,
  VideoJobDocument,
} from "@/lib/video/types";
import {
  isSafeLessonObjectKey,
  isStoredVideoLessonManifest,
} from "@/lib/video/validation";
import { VideoJobServiceError } from "@/lib/video/errors";

const SIGNED_URL_LIFETIME_MS = 45 * 60 * 1_000;
const MAX_MANIFEST_BYTES = 256 * 1_024;

function getVideoBucket() {
  const bucketName = process.env.VIDEO_STORAGE_BUCKET;
  if (!bucketName) {
    throw new VideoJobServiceError(
      "Video storage is not configured.",
      503,
      "storage_not_configured",
    );
  }
  return getStorage(getFirebaseAdminApp()).bucket(bucketName);
}

async function readStoredManifest(
  job: VideoJobDocument,
): Promise<StoredVideoLessonManifest> {
  const manifestObjectKey = job.manifestObjectKey;
  if (
    !manifestObjectKey ||
    !isSafeLessonObjectKey(manifestObjectKey, job.objectPrefix)
  ) {
    throw new VideoJobServiceError(
      "The lesson manifest path is invalid.",
      500,
      "invalid_manifest_path",
    );
  }

  const [buffer] = await getVideoBucket().file(manifestObjectKey).download();
  if (buffer.byteLength > MAX_MANIFEST_BYTES) {
    throw new VideoJobServiceError(
      "The lesson manifest is too large.",
      500,
      "manifest_too_large",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new VideoJobServiceError(
      "The lesson manifest is unreadable.",
      500,
      "invalid_manifest",
    );
  }
  if (!isStoredVideoLessonManifest(parsed)) {
    throw new VideoJobServiceError(
      "The lesson manifest failed validation.",
      500,
      "invalid_manifest",
    );
  }
  if (parsed.lessonId !== job.id) {
    throw new VideoJobServiceError(
      "The lesson manifest does not match this job.",
      500,
      "manifest_job_mismatch",
    );
  }

  const objectKeys = parsed.clips.flatMap((clip) => [
    clip.videoObjectKey,
    clip.captionsObjectKey,
    clip.posterObjectKey,
  ]);
  if (
    objectKeys.some(
      (objectKey) => !isSafeLessonObjectKey(objectKey, job.objectPrefix),
    )
  ) {
    throw new VideoJobServiceError(
      "The lesson contains an invalid media path.",
      500,
      "invalid_media_path",
    );
  }

  return parsed;
}

async function signReadUrl(objectKey: string): Promise<string> {
  const [url] = await getVideoBucket().file(objectKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_LIFETIME_MS,
  });
  return url;
}

export async function createPlaybackManifest(
  job: VideoJobDocument,
): Promise<PlaybackVideoLessonManifest> {
  const manifest = await readStoredManifest(job);
  const clips = await Promise.all(
    manifest.clips.map(async (clip) => {
      const [videoUrl, captionsUrl, posterUrl] = await Promise.all([
        signReadUrl(clip.videoObjectKey),
        signReadUrl(clip.captionsObjectKey),
        signReadUrl(clip.posterObjectKey),
      ]);
      return {
        id: clip.id,
        step: clip.step,
        title: clip.title,
        durationSeconds: clip.durationSeconds,
        videoUrl,
        captionsUrl,
        posterUrl,
      };
    }),
  );

  return {
    ...manifest,
    clips,
  };
}

export async function createVideoGalleryMetadata(
  job: VideoJobDocument,
): Promise<
  Pick<
    PublicVideoJobSummary,
    "title" | "posterUrl" | "clipCount" | "durationSeconds"
  >
> {
  const manifest = await readStoredManifest(job);
  const firstClip = manifest.clips[0];
  return {
    title: manifest.title,
    posterUrl: await signReadUrl(firstClip.posterObjectKey),
    clipCount: manifest.clips.length,
    durationSeconds: Math.round(
      manifest.clips.reduce(
        (total, clip) => total + clip.durationSeconds,
        0,
      ),
    ),
  };
}

export async function deleteLessonObjects(objectPrefix: string): Promise<void> {
  if (!objectPrefix.startsWith("video-lessons/") || objectPrefix.includes("..")) {
    throw new Error("Refusing to delete an unsafe lesson prefix");
  }
  await getVideoBucket().deleteFiles({ prefix: objectPrefix, force: true });
}

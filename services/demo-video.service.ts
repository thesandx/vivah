import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  DEMO_POSTER_TYPES,
  DEMO_VIDEO_DOC_ID,
  DEMO_VIDEO_FOLDER,
  DEMO_VIDEO_TYPES,
  demoFilename,
  type DemoUploadKind,
  demoVideoRoute,
  isDemoContentType,
  isDemoFilename,
  isDemoFilenameFor,
  MAX_DEMO_POSTER_BYTES,
  MAX_DEMO_VIDEO_BYTES,
} from '@/lib/demo-video';
import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { isTmpPath, parseObjectPath, TMP_PREFIX } from '@/lib/storage-paths';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';
import {
  createSignedReadUrl,
  createSignedUploadUrl,
  finalizeUpload,
  type SignedUpload,
} from '@/services/storage.service';

/**
 * The home page's demo video. See `lib/demo-video.ts`.
 *
 * One document, `siteContent/demo-video`, names the video file and its
 * poster. The id is fixed because the home page reads it by key; an admin
 * writes it a few times a year, so it is never a hotspot.
 *
 * The home page gets signed bucket URLs straight in its HTML, so the video
 * starts with no redirect. Signing calls IAM, so each instance signs a file
 * once and keeps the URL for `URL_REUSE_MS`, well inside its lifetime. The
 * video is the site's own marketing, shown to every visitor, so a URL that
 * lives for hours gives nothing away. A kept URL is also the same URL for
 * every visitor of the instance, so the browser's cache can serve a replay.
 */

const filenameSchema = z.string().refine(isDemoFilename, 'Not a demo video file name.');

const demoSchema = z.object({
  file: filenameSchema.nullable(),
  poster: filenameSchema.nullable(),
});

type Demo = z.infer<typeof demoSchema>;

const EMPTY: Demo = { file: null, poster: null };

export const demoVideos = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: demoSchema,
});

const ID_OPTIONS = { minLength: DEMO_VIDEO_DOC_ID.length };

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;
const READ_TIMEOUT_MS = 3000;
const SIGN_TIMEOUT_MS = 3000;

/** A signed URL lives this long... */
const URL_TTL_MS = 12 * 60 * 60 * 1000;
/** ...and an instance hands it out for this long, so a page always gets hours of life. */
const URL_REUSE_MS = 6 * 60 * 60 * 1000;

let cached: { at: number; demo: Demo } | null = null;
const signed = new Map<string, { at: number; url: string }>();

/** The stored video and poster. `fresh` skips the cache, for `/admin`. */
export async function getDemoVideo({ fresh = false } = {}): Promise<Demo> {
  if (!fresh && cached !== null && Date.now() - cached.at < CACHE_MS) return cached.demo;
  const document = await withTimeout(
    demoVideos.get(DEMO_VIDEO_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the demo video',
  );
  const demo = document === null ? EMPTY : demoSchema.parse(document);
  cached = { at: Date.now(), demo };
  return demo;
}

/** Forgets the cached document and URLs on this instance. For tests, and after a change. */
export function resetDemoVideoCache(): void {
  cached = null;
  signed.clear();
}

async function longLivedUrl(file: string): Promise<string> {
  const kept = signed.get(file);
  if (kept !== undefined && Date.now() - kept.at < URL_REUSE_MS) return kept.url;
  const url = await withTimeout(
    createSignedReadUrl(`${DEMO_VIDEO_FOLDER}${file}`, URL_TTL_MS),
    SIGN_TIMEOUT_MS,
    'Signing the demo video',
  );
  signed.set(file, { at: Date.now(), url });
  return url;
}

export interface DemoVideoUrls {
  /** A signed bucket URL that plays at once. */
  src: string;
  /** The route that signs a fresh URL, for when `src` has expired. */
  fallbackSrc: string;
  /** The poster's signed URL, or empty when there is none. */
  poster: string;
}

/** What the home page plays, or `null` when no video is uploaded. */
export async function getDemoVideoUrls(): Promise<DemoVideoUrls | null> {
  const demo = await getDemoVideo();
  if (demo.file === null) return null;
  const [src, poster] = await Promise.all([
    longLivedUrl(demo.file),
    demo.poster === null ? Promise.resolve('') : longLivedUrl(demo.poster),
  ]);
  return { src, fallbackSrc: demoVideoRoute(demo.file), poster };
}

/**
 * A short-lived URL for `file`. Only names `demoFilename` made, in the demo
 * folder: anything else in the bucket stays private.
 */
export async function demoReadUrl(file: string): Promise<string | null> {
  if (!isDemoFilename(file)) return null;
  return createSignedReadUrl(`${DEMO_VIDEO_FOLDER}${file}`);
}

function limitsFor(kind: DemoUploadKind) {
  return kind === 'video'
    ? { maxBytes: MAX_DEMO_VIDEO_BYTES, allowedContentTypes: DEMO_VIDEO_TYPES }
    : { maxBytes: MAX_DEMO_POSTER_BYTES, allowedContentTypes: DEMO_POSTER_TYPES };
}

/** Signs an upload URL for a new video or poster. Only `/admin` calls this, after `requireAdmin()`. */
export async function createDemoVideoUpload(
  kind: DemoUploadKind,
  contentType: string,
): Promise<SignedUpload> {
  if (!isDemoContentType(kind, contentType)) {
    throw new Error(`"${contentType}" is not a type the demo ${kind} takes`);
  }
  return createSignedUploadUrl({
    path: {
      collection: SITE_CONTENT_COLLECTION,
      docId: DEMO_VIDEO_DOC_ID,
      filename: demoFilename(kind, randomUUID()),
    },
    contentType,
    ...limitsFor(kind),
  });
}

/**
 * Checks a pending upload and moves it into place. `tmpPath` came back from
 * the browser, so it is untrusted: it must be in the demo folder, named for
 * `kind`. Returns the file name, or `null` when the path is not one of ours.
 */
async function finalize(kind: DemoUploadKind, tmpPath: string): Promise<string | null> {
  const parts = isTmpPath(tmpPath) ? parseObjectPath(tmpPath.slice(TMP_PREFIX.length)) : null;
  if (
    parts === null ||
    parts.collection !== SITE_CONTENT_COLLECTION ||
    parts.docId !== DEMO_VIDEO_DOC_ID ||
    !isDemoFilenameFor(kind, parts.filename)
  ) {
    return null;
  }
  await finalizeUpload(tmpPath, undefined, limitsFor(kind));
  return parts.filename;
}

/** Writes `demo`, with its audit entry, in one transaction. */
async function setDemo(demo: Demo, adminUid: string): Promise<void> {
  await demoVideos.runTransaction(async (repo, tx) => {
    const current = await repo.get(DEMO_VIDEO_DOC_ID);
    if (current === null) repo.createWithId(DEMO_VIDEO_DOC_ID, demo, ID_OPTIONS);
    else repo.update(DEMO_VIDEO_DOC_ID, demo);
    recordAdminActionIn(tx, {
      action: demo.file === null ? 'demo-video-removed' : 'demo-video-changed',
      targetType: 'site',
      targetId: DEMO_VIDEO_DOC_ID,
      detail:
        demo.file === null
          ? 'Removed the demo video from the home page.'
          : 'Uploaded a new demo video for the home page.',
      adminUid,
    });
  });
  resetDemoVideoCache();
}

/** Saves a new video, and its poster when the browser could make one. */
export async function saveDemoVideo(
  videoTmpPath: string,
  posterTmpPath: string | null,
  adminUid: string,
): Promise<AdminResult> {
  const file = await finalize('video', videoTmpPath);
  if (file === null) {
    return { ok: false, message: 'That upload is not the demo video. Choose the file again.' };
  }
  const poster = posterTmpPath === null ? null : await finalize('poster', posterTmpPath);
  await setDemo({ file, poster }, adminUid);
  return { ok: true, message: 'The demo video is saved. The home page plays it now.' };
}

/** Takes the video off the home page. The files stay in the bucket. */
export async function removeDemoVideo(adminUid: string): Promise<AdminResult> {
  await setDemo(EMPTY, adminUid);
  return { ok: true, message: 'The demo video is removed from the home page.' };
}

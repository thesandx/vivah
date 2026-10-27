import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  DEMO_POSTER_TYPES,
  DEMO_VIDEO_TYPES,
  demoFilename,
  type DemoUploadKind,
  demoVideoRoute,
  isDemoContentType,
  isDemoFilename,
  isDemoFilenameFor,
  MAX_DEMO_POSTER_BYTES,
  MAX_DEMO_VIDEO_BYTES,
  siteVideoDocId,
  siteVideoFolder,
  type SiteVideoSlot,
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
 * The site's uploaded videos: the home page's demo and the two on `/help`.
 * See `lib/demo-video.ts`. Every function takes the slot, `demo` by default.
 *
 * One document per slot, such as `siteContent/demo-video`, names the video
 * file and its poster. The id is fixed because the page reads it by key; an
 * admin writes it a few times a year, so it is never a hotspot.
 *
 * The page gets signed bucket URLs straight in its HTML, so the video
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

/** The shortest slot document id, `demo-video`. */
const ID_OPTIONS = { minLength: siteVideoDocId('demo').length };

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;
const READ_TIMEOUT_MS = 3000;
const SIGN_TIMEOUT_MS = 3000;

/** A signed URL lives this long... */
const URL_TTL_MS = 12 * 60 * 60 * 1000;
/** ...and an instance hands it out for this long, so a page always gets hours of life. */
const URL_REUSE_MS = 6 * 60 * 60 * 1000;

const cached = new Map<SiteVideoSlot, { at: number; demo: Demo }>();
/** Signed URLs, by object path. */
const signed = new Map<string, { at: number; url: string }>();

/** The stored video and poster. `fresh` skips the cache, for `/admin`. */
export async function getDemoVideo({
  fresh = false,
  slot = 'demo',
}: { fresh?: boolean; slot?: SiteVideoSlot } = {}): Promise<Demo> {
  const kept = cached.get(slot);
  if (!fresh && kept !== undefined && Date.now() - kept.at < CACHE_MS) return kept.demo;
  const document = await withTimeout(
    demoVideos.get(siteVideoDocId(slot)),
    READ_TIMEOUT_MS,
    slot === 'demo' ? 'Reading the demo video' : `Reading the ${slot} video`,
  );
  const demo = document === null ? EMPTY : demoSchema.parse(document);
  cached.set(slot, { at: Date.now(), demo });
  return demo;
}

/** Forgets the cached documents and URLs on this instance. For tests, and after a change. */
export function resetDemoVideoCache(): void {
  cached.clear();
  signed.clear();
}

async function longLivedUrl(slot: SiteVideoSlot, file: string): Promise<string> {
  const path = `${siteVideoFolder(slot)}${file}`;
  const kept = signed.get(path);
  if (kept !== undefined && Date.now() - kept.at < URL_REUSE_MS) return kept.url;
  const url = await withTimeout(
    createSignedReadUrl(path, URL_TTL_MS),
    SIGN_TIMEOUT_MS,
    'Signing the demo video',
  );
  signed.set(path, { at: Date.now(), url });
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

/** What the page plays in `slot`, or `null` when no video is uploaded. */
export async function getDemoVideoUrls(
  slot: SiteVideoSlot = 'demo',
): Promise<DemoVideoUrls | null> {
  const demo = await getDemoVideo({ slot });
  if (demo.file === null) return null;
  const [src, poster] = await Promise.all([
    longLivedUrl(slot, demo.file),
    demo.poster === null ? Promise.resolve('') : longLivedUrl(slot, demo.poster),
  ]);
  return { src, fallbackSrc: demoVideoRoute(demo.file, slot), poster };
}

/**
 * A short-lived URL for `file`. Only names `demoFilename` made, in the slot's
 * folder: anything else in the bucket stays private.
 */
export async function demoReadUrl(
  file: string,
  slot: SiteVideoSlot = 'demo',
): Promise<string | null> {
  if (!isDemoFilename(file)) return null;
  return createSignedReadUrl(`${siteVideoFolder(slot)}${file}`);
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
  slot: SiteVideoSlot = 'demo',
): Promise<SignedUpload> {
  if (!isDemoContentType(kind, contentType)) {
    throw new Error(`"${contentType}" is not a type the demo ${kind} takes`);
  }
  return createSignedUploadUrl({
    path: {
      collection: SITE_CONTENT_COLLECTION,
      docId: siteVideoDocId(slot),
      filename: demoFilename(kind, randomUUID()),
    },
    contentType,
    ...limitsFor(kind),
  });
}

/**
 * Checks a pending upload and moves it into place. `tmpPath` came back from
 * the browser, so it is untrusted: it must be in the slot's folder, named for
 * `kind`. Returns the file name, or `null` when the path is not one of ours.
 */
async function finalize(
  slot: SiteVideoSlot,
  kind: DemoUploadKind,
  tmpPath: string,
): Promise<string | null> {
  const parts = isTmpPath(tmpPath) ? parseObjectPath(tmpPath.slice(TMP_PREFIX.length)) : null;
  if (
    parts === null ||
    parts.collection !== SITE_CONTENT_COLLECTION ||
    parts.docId !== siteVideoDocId(slot) ||
    !isDemoFilenameFor(kind, parts.filename)
  ) {
    return null;
  }
  await finalizeUpload(tmpPath, undefined, limitsFor(kind));
  return parts.filename;
}

/** Where each slot shows, for the audit log and the admin's messages. */
const PLACE: Record<SiteVideoSlot, string> = {
  demo: 'the home page',
  'help-edit-details': 'the help page (edit details)',
  'help-guest-invite': 'the help page (guest invites)',
  'help-functions': 'the help page (functions)',
  'help-families': 'the help page (families)',
};

/** Writes `demo`, with its audit entry, in one transaction. */
async function setDemo(slot: SiteVideoSlot, demo: Demo, adminUid: string): Promise<void> {
  const docId = siteVideoDocId(slot);
  const removed = demo.file === null;
  await demoVideos.runTransaction(async (repo, tx) => {
    const current = await repo.get(docId);
    if (current === null) repo.createWithId(docId, demo, ID_OPTIONS);
    else repo.update(docId, demo);
    recordAdminActionIn(tx, {
      action:
        slot === 'demo'
          ? removed
            ? 'demo-video-removed'
            : 'demo-video-changed'
          : removed
            ? 'help-video-removed'
            : 'help-video-changed',
      targetType: 'site',
      targetId: docId,
      detail: removed
        ? `Removed the video from ${PLACE[slot]}.`
        : `Uploaded a new video for ${PLACE[slot]}.`,
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
  slot: SiteVideoSlot = 'demo',
): Promise<AdminResult> {
  const file = await finalize(slot, 'video', videoTmpPath);
  if (file === null) {
    return { ok: false, message: 'That upload is not this video. Choose the file again.' };
  }
  const poster = posterTmpPath === null ? null : await finalize(slot, 'poster', posterTmpPath);
  await setDemo(slot, { file, poster }, adminUid);
  return {
    ok: true,
    message:
      slot === 'demo'
        ? 'The demo video is saved. The home page plays it now.'
        : 'The video is saved. The help page plays it now.',
  };
}

/** Takes the video off its page. The files stay in the bucket. */
export async function removeDemoVideo(
  adminUid: string,
  slot: SiteVideoSlot = 'demo',
): Promise<AdminResult> {
  await setDemo(slot, EMPTY, adminUid);
  return {
    ok: true,
    message:
      slot === 'demo'
        ? 'The demo video is removed from the home page.'
        : `The video is removed from ${PLACE[slot]}.`,
  };
}

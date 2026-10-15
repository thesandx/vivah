import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  HOW_IT_WORKS_DOC_ID,
  isStepImageFilename,
  isStepImageType,
  MAX_STEP_IMAGE_BYTES,
  SITE_CONTENT_COLLECTION,
  STEP_IMAGE_TYPES,
  stepImageFilename,
  type StepNumber,
} from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { isTmpPath, parseObjectPath, TMP_PREFIX } from '@/lib/storage-paths';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';
import { getBucket } from '@/services/storage.client';
import {
  createSignedUploadUrl,
  deleteObject,
  finalizeUpload,
  type SignedUpload,
} from '@/services/storage.service';

/**
 * Content of the product site that an admin changes from `/admin`, without a
 * deploy. Today that is the three phone screens in the home page's "How it
 * works" section.
 *
 * One document, `siteContent/how-it-works-steps`, holds the object path of
 * each step's image, or `null` for the placeholder. The id is fixed because
 * the document is read by key on every image request; it is written a few
 * times a year, so it cannot become a hotspot.
 *
 * The images live in the app's private bucket under
 * `siteContent/how-it-works-steps/`. Each upload gets a new file name, so a
 * replaced image never shares a URL with the one before it.
 */

const stepImagesSchema = z.object({
  step1: z.string().max(512).nullable(),
  step2: z.string().max(512).nullable(),
  step3: z.string().max(512).nullable(),
});

type StepImages = z.infer<typeof stepImagesSchema>;

const EMPTY: StepImages = { step1: null, step2: null, step3: null };

export const siteContent = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: stepImagesSchema,
});

/** The id is fixed and short on purpose; see the module comment. */
const ID_OPTIONS = { minLength: HOW_IT_WORKS_DOC_ID.length };

function key(step: StepNumber): keyof StepImages {
  return `step${step}`;
}

/**
 * How long one instance keeps the paths before it reads them again. Short,
 * so a new image shows within a minute, and long enough that a busy home
 * page reads the document once a minute, not once per visitor.
 */
const CACHE_MS = 60 * 1000;

/** Each read of the paths gives up after this, and the page shows the placeholder. */
const READ_TIMEOUT_MS = 3000;

let cached: { at: number; images: StepImages } | null = null;

/**
 * The stored image path for each step. `null` means the placeholder.
 * `fresh` skips the cache, for `/admin`, which must show what is saved.
 */
export async function getStepImages({ fresh = false } = {}): Promise<StepImages> {
  if (!fresh && cached !== null && Date.now() - cached.at < CACHE_MS) return cached.images;
  const document = await withTimeout(
    siteContent.get(HOW_IT_WORKS_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the How it works images',
  );
  const images = document === null ? EMPTY : stepImagesSchema.parse(document);
  cached = { at: Date.now(), images };
  return images;
}

/** Forgets the cached paths on this instance. For tests, and after a change. */
export function resetStepImagesCache(): void {
  cached = null;
}

export interface StoredImage {
  bytes: Buffer;
  contentType: string;
}

/** Reads one stored image from the bucket. */
export async function readStepImage(path: string): Promise<StoredImage> {
  const file = getBucket().file(path);
  const [[bytes], [metadata]] = await withTimeout(
    Promise.all([file.download(), file.getMetadata()]),
    READ_TIMEOUT_MS * 2,
    'Reading a How it works image',
  );
  return { bytes, contentType: metadata.contentType ?? 'application/octet-stream' };
}

/**
 * Signs an upload URL for a new image for `step`. Only `/admin` calls this,
 * after `requireAdmin()`.
 */
export async function createStepImageUpload(
  step: StepNumber,
  contentType: string,
): Promise<SignedUpload> {
  if (!isStepImageType(contentType)) {
    throw new Error(`"${contentType}" is not an image type the home page takes`);
  }
  return createSignedUploadUrl({
    path: {
      collection: SITE_CONTENT_COLLECTION,
      docId: HOW_IT_WORKS_DOC_ID,
      filename: stepImageFilename(step, contentType, randomUUID()),
    },
    contentType,
    maxBytes: MAX_STEP_IMAGE_BYTES,
    allowedContentTypes: STEP_IMAGE_TYPES,
  });
}

/** Writes `path` (or `null`) for `step`, with its audit entry, in one transaction. */
async function setStepImage(
  step: StepNumber,
  path: string | null,
  adminUid: string,
): Promise<string | null> {
  const previous = await siteContent.runTransaction(async (repo, tx) => {
    const current = await repo.get(HOW_IT_WORKS_DOC_ID);
    const before = current === null ? null : current[key(step)];
    if (current === null) {
      repo.createWithId(HOW_IT_WORKS_DOC_ID, { ...EMPTY, [key(step)]: path }, ID_OPTIONS);
    } else {
      repo.update(HOW_IT_WORKS_DOC_ID, { [key(step)]: path });
    }
    recordAdminActionIn(tx, {
      action: path === null ? 'home-image-reset' : 'home-image-changed',
      targetType: 'site',
      targetId: HOW_IT_WORKS_DOC_ID,
      detail:
        path === null
          ? `Put back the placeholder for How it works step ${step}.`
          : `Changed the How it works image for step ${step}.`,
      adminUid,
    });
    return before;
  });
  resetStepImagesCache();
  return previous;
}

/**
 * Removes the image a change replaced. A failure is logged and not thrown:
 * the new image is already live, and an orphan in the bucket harms nobody.
 */
async function removeReplaced(previous: string | null, next: string | null): Promise<void> {
  if (previous === null || previous === next) return;
  try {
    await deleteObject(previous);
  } catch (error) {
    logger.warn('Could not remove a replaced How it works image', {
      path: previous,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Checks the finished upload and makes it the image for `step`.
 *
 * `tmpPath` came back from the browser, so it is untrusted: it must be a
 * pending upload in this document's folder, named for this step. Without
 * that check, an upload for step 1 could be saved as step 3.
 */
export async function saveStepImage(
  step: StepNumber,
  tmpPath: string,
  adminUid: string,
): Promise<AdminResult> {
  const parts = isTmpPath(tmpPath) ? parseObjectPath(tmpPath.slice(TMP_PREFIX.length)) : null;
  if (
    parts === null ||
    parts.collection !== SITE_CONTENT_COLLECTION ||
    parts.docId !== HOW_IT_WORKS_DOC_ID ||
    !isStepImageFilename(step, parts.filename)
  ) {
    return { ok: false, message: 'That upload is not for this step. Choose the image again.' };
  }

  const finalized = await finalizeUpload(tmpPath, undefined, {
    maxBytes: MAX_STEP_IMAGE_BYTES,
    allowedContentTypes: STEP_IMAGE_TYPES,
  });
  const previous = await setStepImage(step, finalized.path, adminUid);
  await removeReplaced(previous, finalized.path);
  return { ok: true, message: `Step ${step} has a new image.` };
}

/** Puts the placeholder back for `step`. */
export async function resetStepImage(step: StepNumber, adminUid: string): Promise<AdminResult> {
  const previous = await setStepImage(step, null, adminUid);
  await removeReplaced(previous, null);
  return { ok: true, message: `Step ${step} shows the placeholder again.` };
}

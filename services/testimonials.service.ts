import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { isTmpPath, parseObjectPath, TMP_PREFIX } from '@/lib/storage-paths';
import {
  bannerSchema,
  type ChatFields,
  chatFieldsSchema,
  isTestimonialImageFilename,
  isTestimonialImageType,
  MAX_TESTIMONIAL_IMAGE_BYTES,
  MAX_TESTIMONIALS,
  type ReviewFields,
  reviewFieldsSchema,
  TESTIMONIAL_IMAGE_TYPES,
  testimonialImageFilename,
  type TestimonialKind,
} from '@/lib/testimonials';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { type AdminAction, recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository, type Repository, type StoredDocument } from '@/services/repository';
import { getBucket } from '@/services/storage.client';
import {
  createSignedUploadUrl,
  deleteObject,
  finalizeUpload,
  type SignedUpload,
} from '@/services/storage.service';

/**
 * The home page's chat screenshots, couple reviews and "Loved by …" banner,
 * which the admin changes from the Home page tab of `/admin`. See
 * `lib/testimonials.ts` for the rules.
 *
 * - `homeChats` and `homeReviews` hold one document per item, with the
 *   object path of its image and a `position` that orders the row. A
 *   removed item is soft-deleted and keeps its image, so it can be restored.
 * - `siteContent/home-banner` holds the banner's one line.
 *
 * Images live in the app's private bucket under `siteContent/home-chats/` and
 * `siteContent/home-reviews/`. `GET /api/testimonials/<kind>/<id>` serves
 * them. Each upload gets a new file name, so a URL never changes its image.
 */

const imagePath = z.string().min(1).max(512);
const position = z.number().int().min(0);

const chatSchema = chatFieldsSchema.extend({ image: imagePath, position });
const reviewSchema = reviewFieldsSchema.extend({ image: imagePath, position });

export type ChatItem = StoredDocument<z.infer<typeof chatSchema>>;
export type ReviewItem = StoredDocument<z.infer<typeof reviewSchema>>;

export const homeChats = createRepository({ collection: 'homeChats', schema: chatSchema });
export const homeReviews = createRepository({ collection: 'homeReviews', schema: reviewSchema });

const BANNER_DOC_ID = 'home-banner';
const homeBanner = createRepository({ collection: SITE_CONTENT_COLLECTION, schema: bannerSchema });

/** The folder (the `docId` segment of the object path) for each kind's images. */
const IMAGE_FOLDER: Record<TestimonialKind, string> = {
  chat: 'home-chats',
  review: 'home-reviews',
};

const NOUN: Record<TestimonialKind, string> = { chat: 'chat screenshot', review: 'couple review' };

/**
 * How long one instance keeps the content before it reads it again. Short,
 * so a change shows within a minute on every instance, and long enough that
 * a busy home page reads Firestore once a minute, not once per visitor.
 */
const CACHE_MS = 60 * 1000;

/** Each read gives up after this, and the home page leaves the section out. */
const READ_TIMEOUT_MS = 3000;

export interface HomeTestimonials {
  chats: readonly ChatItem[];
  reviews: readonly ReviewItem[];
  /** The banner line, or `''` to hide the banner. */
  headline: string;
}

let cached: { at: number; content: HomeTestimonials } | null = null;

/** Forgets the cached content on this instance. For tests, and after a change. */
export function resetTestimonialsCache(): void {
  cached = null;
}

async function readAll(): Promise<HomeTestimonials> {
  const order = [{ field: 'position', direction: 'asc' as const }];
  const [chats, reviews, banner] = await Promise.all([
    homeChats.list({ limit: MAX_TESTIMONIALS, orderBy: order }),
    homeReviews.list({ limit: MAX_TESTIMONIALS, orderBy: order }),
    homeBanner.get(BANNER_DOC_ID),
  ]);
  return { chats: chats.items, reviews: reviews.items, headline: banner?.headline ?? '' };
}

/**
 * Everything the home page shows. `fresh` skips the cache, for `/admin`,
 * which must show what is saved.
 */
export async function getHomeTestimonials({ fresh = false } = {}): Promise<HomeTestimonials> {
  if (!fresh && cached !== null && Date.now() - cached.at < CACHE_MS) return cached.content;
  const content = await withTimeout(readAll(), READ_TIMEOUT_MS, 'Reading the home testimonials');
  cached = { at: Date.now(), content };
  return content;
}

/** One item by id, for the image route. `null` when it is missing or removed. */
export async function getTestimonialImagePath(
  kind: TestimonialKind,
  id: string,
): Promise<string | null> {
  const read: Promise<{ image: string } | null> =
    kind === 'chat' ? homeChats.get(id) : homeReviews.get(id);
  const item = await withTimeout(read, READ_TIMEOUT_MS, 'Reading a testimonial');
  return item?.image ?? null;
}

export interface StoredImage {
  bytes: Buffer;
  contentType: string;
}

/** Reads one stored image from the bucket. */
export async function readTestimonialImage(path: string): Promise<StoredImage> {
  const file = getBucket().file(path);
  const [[bytes], [metadata]] = await withTimeout(
    Promise.all([file.download(), file.getMetadata()]),
    READ_TIMEOUT_MS * 2,
    'Reading a testimonial image',
  );
  return { bytes, contentType: metadata.contentType ?? 'application/octet-stream' };
}

/** Signs an upload URL for a new image. Only `/admin` calls this, after `requireAdmin()`. */
export async function createTestimonialUpload(
  kind: TestimonialKind,
  contentType: string,
): Promise<SignedUpload> {
  if (!isTestimonialImageType(contentType)) {
    throw new Error(`"${contentType}" is not an image type the home page takes`);
  }
  return createSignedUploadUrl({
    path: {
      collection: SITE_CONTENT_COLLECTION,
      docId: IMAGE_FOLDER[kind],
      filename: testimonialImageFilename(kind, contentType, randomUUID()),
    },
    contentType,
    maxBytes: MAX_TESTIMONIAL_IMAGE_BYTES,
    allowedContentTypes: TESTIMONIAL_IMAGE_TYPES,
  });
}

/**
 * Checks a finished upload and moves it to its permanent path.
 *
 * `tmpPath` came back from the browser, so it is untrusted: it must be a
 * pending upload in this kind's folder, named for this kind. Returns `null`
 * when it is not.
 */
async function promoteUpload(kind: TestimonialKind, tmpPath: string): Promise<string | null> {
  const parts = isTmpPath(tmpPath) ? parseObjectPath(tmpPath.slice(TMP_PREFIX.length)) : null;
  if (
    parts === null ||
    parts.collection !== SITE_CONTENT_COLLECTION ||
    parts.docId !== IMAGE_FOLDER[kind] ||
    !isTestimonialImageFilename(kind, parts.filename)
  ) {
    return null;
  }
  const finalized = await finalizeUpload(tmpPath, undefined, {
    maxBytes: MAX_TESTIMONIAL_IMAGE_BYTES,
    allowedContentTypes: TESTIMONIAL_IMAGE_TYPES,
  });
  return finalized.path;
}

/**
 * Removes an image a change replaced. A failure is logged and not thrown:
 * the new image is already live, and an orphan in the bucket harms nobody.
 */
async function removeReplaced(previous: string): Promise<void> {
  try {
    await deleteObject(previous);
  } catch (error) {
    logger.warn('Could not remove a replaced testimonial image', {
      path: previous,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

const BAD_UPLOAD: AdminResult = {
  ok: false,
  message: 'That upload is not for this list. Choose the image again.',
};
const NOT_FOUND: AdminResult = { ok: false, message: 'That item no longer exists.' };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the fields and try again.';
}

function audit(
  action: AdminAction,
  kind: TestimonialKind,
  id: string,
  detail: string,
  adminUid: string,
) {
  return {
    action,
    targetType: 'site' as const,
    targetId: id,
    detail: `${detail} (${NOUN[kind]}).`,
    adminUid,
  };
}

type Stored<TFields> = TFields & { image: string; position: number };

/**
 * The operations on one kind of item. Chats and reviews differ only in their
 * fields, so both come from this one factory.
 */
function createStore<TFields extends ChatFields | ReviewFields>(
  kind: TestimonialKind,
  fieldsSchema: z.ZodType<TFields>,
  repo: Repository<Stored<TFields>>,
) {
  async function list() {
    return repo.list({
      limit: MAX_TESTIMONIALS,
      orderBy: [{ field: 'position', direction: 'asc' }],
    });
  }

  /** Adds an item at the end of the row. */
  async function add(raw: unknown, tmpPath: string, adminUid: string): Promise<AdminResult> {
    const fields = fieldsSchema.safeParse(raw);
    if (!fields.success) return { ok: false, message: firstIssue(fields.error) };
    const current = await list();
    if (current.items.length >= MAX_TESTIMONIALS) {
      return { ok: false, message: `The home page takes ${MAX_TESTIMONIALS}. Remove one first.` };
    }
    const image = await promoteUpload(kind, tmpPath);
    if (image === null) return BAD_UPLOAD;

    const last = current.items.at(-1)?.position ?? -1;
    await repo.runTransaction(async (tx, transaction) => {
      const id = tx.create({ ...fields.data, image, position: last + 1 });
      recordAdminActionIn(
        transaction,
        audit('testimonial-added', kind, id, 'Added an item', adminUid),
      );
    });
    resetTestimonialsCache();
    return { ok: true, message: 'Added. The home page shows it within a minute.' };
  }

  /** Saves new words, and a new image when `tmpPath` is set. */
  async function edit(
    id: string,
    raw: unknown,
    tmpPath: string | null,
    adminUid: string,
  ): Promise<AdminResult> {
    const fields = fieldsSchema.safeParse(raw);
    if (!fields.success) return { ok: false, message: firstIssue(fields.error) };
    if ((await repo.get(id)) === null) return NOT_FOUND;

    let image: string | null = null;
    if (tmpPath !== null) {
      image = await promoteUpload(kind, tmpPath);
      if (image === null) return BAD_UPLOAD;
    }

    const previous = await repo.runTransaction(async (tx, transaction) => {
      const current = await tx.get(id);
      if (current === null) return null;
      // TypeScript cannot see that a generic `TFields` spread fits a partial of
      // itself; zod already checked every field above.
      const patch = { ...fields.data, ...(image !== null && { image }) } as unknown as Partial<
        Stored<TFields>
      >;
      tx.update(id, patch);
      recordAdminActionIn(
        transaction,
        audit(
          'testimonial-edited',
          kind,
          id,
          image === null ? 'Changed the words' : 'Changed the words and the image',
          adminUid,
        ),
      );
      return current;
    });
    if (previous === null) return NOT_FOUND;
    resetTestimonialsCache();
    if (image !== null && previous.image !== image) await removeReplaced(previous.image);
    return { ok: true, message: 'Saved. The home page shows it within a minute.' };
  }

  /** Takes an item off the home page. Soft: the document and its image stay. */
  async function remove(id: string, adminUid: string): Promise<AdminResult> {
    const removed = await repo.runTransaction(async (tx, transaction) => {
      if ((await tx.get(id)) === null) return false;
      tx.softDelete(id);
      recordAdminActionIn(
        transaction,
        audit('testimonial-removed', kind, id, 'Took an item off the home page', adminUid),
      );
      return true;
    });
    if (!removed) return NOT_FOUND;
    resetTestimonialsCache();
    return { ok: true, message: 'Removed from the home page.' };
  }

  /** Swaps an item with its neighbour, one place earlier or later in the row. */
  async function move(id: string, direction: 'up' | 'down', adminUid: string) {
    const { items } = await list();
    const index = items.findIndex((item) => item.id === id);
    const other = items[direction === 'up' ? index - 1 : index + 1];
    const item = items[index];
    if (item === undefined) return NOT_FOUND;
    if (other === undefined) return { ok: true, message: 'It is already at that end.' };

    await repo.runTransaction(async (tx, transaction) => {
      const [a, b] = await Promise.all([tx.get(item.id), tx.get(other.id)]);
      if (a === null || b === null) return;
      // Distinct positions even if two items once shared one.
      const [first, second] = direction === 'up' ? [b, a] : [a, b];
      const low = Math.min(a.position, b.position);
      const high = Math.max(a.position, b.position, low + 1);
      tx.update(second.id, { position: low } as Partial<Stored<TFields>>);
      tx.update(first.id, { position: high } as Partial<Stored<TFields>>);
      recordAdminActionIn(
        transaction,
        audit('testimonial-moved', kind, id, `Moved an item ${direction}`, adminUid),
      );
    });
    resetTestimonialsCache();
    return { ok: true, message: 'Moved.' } satisfies AdminResult;
  }

  return { add, edit, remove, move };
}

export const chatStore = createStore('chat', chatFieldsSchema, homeChats);
export const reviewStore = createStore('review', reviewFieldsSchema, homeReviews);

export function storeFor(kind: TestimonialKind) {
  return kind === 'chat' ? chatStore : reviewStore;
}

/** Sets the banner line. `''` hides the banner. */
export async function saveBanner(raw: unknown, adminUid: string): Promise<AdminResult> {
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const { headline } = parsed.data;

  await homeBanner.runTransaction(async (tx, transaction) => {
    if ((await tx.get(BANNER_DOC_ID)) === null) {
      tx.createWithId(BANNER_DOC_ID, { headline }, { minLength: BANNER_DOC_ID.length });
    } else {
      tx.update(BANNER_DOC_ID, { headline });
    }
    recordAdminActionIn(transaction, {
      action: 'banner-changed',
      targetType: 'site',
      targetId: BANNER_DOC_ID,
      detail: headline === '' ? 'Hid the home page banner.' : `Set the banner to “${headline}”.`,
      adminUid,
    });
  });
  resetTestimonialsCache();
  return {
    ok: true,
    message: headline === '' ? 'The banner is hidden.' : 'Saved. The banner shows within a minute.',
  };
}

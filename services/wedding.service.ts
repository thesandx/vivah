import 'server-only';

import { z } from 'zod';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import { createRepository, type StoredDocument } from '@/services/repository';

/**
 * Weddings: one per paid couple, served at `<slug>.<root domain>`.
 *
 * The payment step creates these (it reserves the slug, then writes the
 * document). This module only reads them, for the invite page.
 *
 * The slug is a field with an index, not the document id. The repository
 * refuses a short, human-readable id (see `lib/document-ids.ts`), and an auto
 * id keeps writes spread out. The read is one indexed equality query.
 */

export const WEDDING_COLLECTION = 'weddings';

export const weddingSchema = z.object({
  /** The first label of the invite host. Unique; the payment step enforces it. */
  slug: z.string().refine(isValidCoupleSlug, 'Not a valid couple slug.'),
  bride: z.string().trim().min(1).max(60),
  groom: z.string().trim().min(1).max(60),
  /** `YYYY-MM-DD`, or `null` until the couple adds it in the dashboard. */
  weddingDate: z.iso.date().nullable(),
  /** E.164. The couple's WhatsApp number and their dashboard login. Never logged. */
  ownerPhoneE164: z.string().regex(/^\+\d{8,15}$/),
  /** The lead this wedding was paid from. */
  leadId: z.string().min(1).max(128),
});

export type WeddingPayload = z.infer<typeof weddingSchema>;
export type WeddingDocument = StoredDocument<WeddingPayload>;

export const weddings = createRepository({
  collection: WEDDING_COLLECTION,
  schema: weddingSchema,
});

/**
 * The wedding at `slug`, or `null`. Served by the `(slug, deletedAt,
 * createdAt)` index in `firestore.indexes.json`.
 */
export async function getWeddingBySlug(slug: string): Promise<WeddingDocument | null> {
  if (!isValidCoupleSlug(slug)) return null;
  const page = await weddings.list({ limit: 1, where: [['slug', '==', slug]] });
  return page.items[0] ?? null;
}

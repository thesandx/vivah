import 'server-only';

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { isValidCoupleSlug, slugCandidates, slugProblem } from '@/lib/couple-slug';
import { capitalizeName } from '@/lib/guest-name';
import { isGoogleMapsUrl } from '@/lib/invite-contact';
import { canEditWedding, parseWeddingDetails, type WeddingDetails } from '@/lib/wedding-details';
import { chosenSongSchema } from '@/lib/wedding-songs';
import { leads, tokenMatches } from '@/services/lead.service';
import { createRepository, type StoredDocument } from '@/services/repository';

/**
 * Weddings: one per paid couple, served at `<slug>.<root domain>`.
 *
 * `publishWedding` creates them: it reserves the slug and writes the wedding
 * in one transaction. The invite page reads them by slug.
 *
 * The slug is a field with an index, not the document id. The repository
 * refuses a short, human-readable id (see `lib/document-ids.ts`), and an auto
 * id keeps writes spread out. The read is one indexed equality query.
 */

export const WEDDING_COLLECTION = 'weddings';

export const WEDDING_STATUSES = ['live', 'unavailable'] as const;
export type WeddingStatus = (typeof WEDDING_STATUSES)[number];

export const weddingSchema = z.object({
  /** The first label of the invite host. Unique; the payment step enforces it. */
  slug: z.string().refine(isValidCoupleSlug, 'Not a valid couple slug.'),
  /** Read through `capitalizeName`, so a name saved as `riya` shows as `Riya`. */
  bride: z.string().trim().min(1).max(60).transform(capitalizeName),
  groom: z.string().trim().min(1).max(60).transform(capitalizeName),
  /** `YYYY-MM-DD`, or `null` until the couple adds it in the dashboard. */
  weddingDate: z.iso.date().nullable(),
  /** E.164. The couple's WhatsApp number and their dashboard login. Never logged. */
  ownerPhoneE164: z.string().regex(/^\+\d{8,15}$/),
  /** The lead this wedding was paid from. */
  leadId: z.string().min(1).max(128),
  /**
   * `unavailable` shows guests a polite "not available right now" page
   * instead of the invite. Set from `/admin`, on a couple's request, and
   * reversible. Optional: absent means `live`, so no backfill is needed.
   */
  status: z.enum(WEDDING_STATUSES).optional(),
  // The ceremony details the invite shows. Optional: a wedding is published
  // before the couple adds them, and the invite says "shared soon" until then.
  // The couple sets them in the dashboard; `null` clears one.
  /** `HH:MM`, 24-hour, India Standard Time. */
  ceremonyTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  /** The venue's name: `The Grand Pavilion, Chhatarpur`. */
  venueName: z.string().trim().min(1).max(80).nullable().optional(),
  /** The town and state: `New Delhi, Delhi`. */
  venueCity: z.string().trim().min(1).max(80).nullable().optional(),
  /** A Google Maps share link, pasted by the couple. No Maps API. */
  venueMapsUrl: z
    .string()
    .max(500)
    .refine(isGoogleMapsUrl, 'Not a Google Maps link.')
    .nullable()
    .optional(),
  /**
   * The song guests can play on the invite, chosen on the sign-up card.
   * Never autoplays. Optional: absent means no music.
   */
  song: chosenSongSchema.optional(),
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

/** A couple has one wedding; a few allows a second without a schema change. */
const OWNED_LIMIT = 10;

/**
 * The weddings paid for from this phone number: what the couple dashboard
 * lists. Served by the `(ownerPhoneE164, deletedAt, createdAt)` index.
 */
export async function weddingsOwnedBy(phoneE164: string): Promise<readonly WeddingDocument[]> {
  const page = await weddings.list({
    limit: OWNED_LIMIT,
    where: [['ownerPhoneE164', '==', phoneE164]],
  });
  return page.items;
}

/** The outcome of a dashboard save. */
export type UpdateResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not-found' | 'forbidden' | 'invalid';
      errors?: Partial<Record<keyof WeddingDetails, string>>;
    };

/**
 * Saves the couple's details. The caller's phone number comes from the
 * verified session, never from the form. A stranger gets `not-found`, not
 * `forbidden`, so the dashboard does not confirm which addresses exist.
 */
export async function updateWeddingDetails(
  slug: string,
  callerPhoneE164: string | null,
  form: Record<string, unknown>,
): Promise<UpdateResult> {
  const wedding = await getWeddingBySlug(slug);
  if (wedding === null) return { ok: false, reason: 'not-found' };
  if (!canEditWedding(callerPhoneE164, wedding.ownerPhoneE164)) {
    return { ok: false, reason: 'not-found' };
  }
  const parsed = parseWeddingDetails(form);
  if (!parsed.ok) return { ok: false, reason: 'invalid', errors: parsed.errors };
  await weddings.update(wedding.id, parsed.details);
  return { ok: true };
}

/**
 * Slug claims: one document per address in use, so two couples can never
 * publish at the same address.
 *
 * Firestore has no unique index. The claim document is the lock: its id is
 * derived from the slug, and `createWithId` inside a transaction fails if it
 * exists. The id is the SHA-256 of the slug, not the slug itself, because the
 * repository refuses short, human-readable ids (see `lib/document-ids.ts`),
 * and a hash spreads the writes across the key range.
 */
export const SLUG_CLAIM_COLLECTION = 'slugClaims';

export const slugClaimSchema = z.object({
  slug: z.string().refine(isValidCoupleSlug, 'Not a valid couple slug.'),
  weddingId: z.string().min(1).max(128),
  leadId: z.string().min(1).max(128),
});

export const slugClaims = createRepository({
  collection: SLUG_CLAIM_COLLECTION,
  schema: slugClaimSchema,
});

/** The claim document id for `slug`: 64 hex characters. */
export function slugClaimId(slug: string): string {
  return createHash('sha256').update(slug).digest('hex');
}

/** Whether `slug` can be published at: a valid shape and nobody holds it. */
export type SlugAvailability =
  | { available: true }
  | { available: false; reason: 'invalid'; message: string }
  | { available: false; reason: 'taken' };

export async function checkSlug(slug: string): Promise<SlugAvailability> {
  const problem = slugProblem(slug);
  if (problem !== null) return { available: false, reason: 'invalid', message: problem };
  const [claim, wedding] = await Promise.all([
    slugClaims.get(slugClaimId(slug)),
    getWeddingBySlug(slug),
  ]);
  return claim === null && wedding === null
    ? { available: true }
    : { available: false, reason: 'taken' };
}

/**
 * A query for a live wedding at `slug`, for use inside a transaction. The
 * claim is the lock; this is a second guard, for a wedding written without a
 * claim (by hand, or before claims existed). It never overwrites either.
 */
export function weddingAtSlugQuery(slug: string) {
  return weddings.ref().where('slug', '==', slug).where('deletedAt', '==', null).limit(1);
}

/**
 * The first `count` free addresses for a couple, best first. Checked one at a
 * time and stops early, so a couple whose names are free costs two checks.
 * A couple never sees a suggestion that is taken: the page offers only these.
 */
export async function freeSlugSuggestions(
  bride: string,
  groom: string,
  count = 2,
): Promise<string[]> {
  const free: string[] = [];
  for (const slug of slugCandidates(bride, groom)) {
    if (free.length >= count) break;
    // Sequential on purpose: most couples stop after the first two.
    if ((await checkSlug(slug)).available) free.push(slug);
  }
  return free;
}

export type PublishResult =
  | { state: 'published'; slug: string }
  | { state: 'already-published'; slug: string }
  | { state: 'taken' }
  | { state: 'invalid'; message: string }
  | { state: 'not-found' }
  | { state: 'expired' }
  | { state: 'other-browser' };

/**
 * Publishes a lead's invite at `slug`: reserves the slug, writes the wedding
 * and marks the lead paid, in ONE transaction, so a crash or a race never
 * leaves a claim without a wedding or two weddings at one address.
 *
 * TEMPORARY: nothing here takes money. The preview page calls this from its
 * test payment button until Cashfree is connected. Then the Cashfree webhook
 * calls it, once the payment link reports PAID. See ADR-0007.
 *
 * Only the browser the preview is bound to may publish: the caller passes the
 * token from that browser's preview cookie.
 */
export async function publishWedding(
  leadId: string,
  token: string | undefined,
  slug: string,
  now: Date = new Date(),
): Promise<PublishResult> {
  const problem = slugProblem(slug);
  if (problem !== null) return { state: 'invalid', message: problem };

  const claimId = slugClaimId(slug);
  return slugClaims.runTransaction(async (claimsTx, tx) => {
    const leadsTx = leads.inTransaction(tx);
    const weddingsTx = weddings.inTransaction(tx);

    // All reads first: a Firestore transaction refuses a read after a write.
    const lead = await leadsTx.get(leadId);
    const claim = await claimsTx.get(claimId);
    const existing = await tx.get(weddingAtSlugQuery(slug));

    if (lead === null) return { state: 'not-found' as const };
    if (lead.previewTokenHash === null || !tokenMatches(token, lead.previewTokenHash)) {
      return { state: 'other-browser' as const };
    }
    if (lead.status === 'paid' && lead.weddingSlug !== undefined) {
      // A second tap on the button. Answer with the address it already has.
      return { state: 'already-published' as const, slug: lead.weddingSlug };
    }
    if (lead.expiresAt.getTime() <= now.getTime()) return { state: 'expired' as const };
    if (claim !== null || !existing.empty) return { state: 'taken' as const };

    const weddingId = weddingsTx.create({
      slug,
      bride: lead.bride,
      groom: lead.groom,
      weddingDate: lead.weddingDate,
      ownerPhoneE164: lead.phoneE164,
      leadId,
      ...(lead.song !== undefined && { song: lead.song }),
    });
    // `tx.create` under the hood: if another request claimed the slug after
    // the read above, the whole transaction fails and retries, then sees it.
    claimsTx.createWithId(claimId, { slug, weddingId, leadId });
    leadsTx.update(leadId, { status: 'paid', weddingSlug: slug });
    return { state: 'published' as const, slug };
  });
}

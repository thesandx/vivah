import 'server-only';

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { guestLinkKey, guestLinkSegment, parseGuestName } from '@/lib/guest-name';
import { canEditWedding } from '@/lib/wedding-details';
import { createRepository, type StoredDocument } from '@/services/repository';
import { getWeddingBySlug, type WeddingDocument } from '@/services/wedding.service';

/**
 * Guest links: the personal links a couple makes in the dashboard, such as
 * `radha-shyam.vivah.online/Rahul-Sharma`.
 *
 * They live in a subcollection, `weddings/{weddingId}/guestLinks`, because a
 * wedding can have hundreds of guests (docs/firestore-modeling.md: anything
 * unbounded is a subcollection).
 *
 * The document id is the SHA-256 of the link's key (see `guestLinkKey`). That
 * makes two things one key lookup, with no index:
 * - a second guest of the same name gets the next free number (`-2`, `-3`),
 *   inside a transaction, so two taps never make the same link;
 * - the invite page finds a deleted link, and greets that guest with the
 *   couple's general invite instead of their name.
 *
 * A deleted link is soft-deleted and its id stays taken, so a new guest never
 * inherits a link the couple already removed.
 *
 * A link typed by hand (`/Neha`), as before this collection existed, has
 * no document. It keeps greeting the guest by name.
 */

export const GUEST_LINK_COLLECTION = 'guestLinks';

/** Far above a large Indian wedding; a bound keeps every read finite. */
export const MAX_GUEST_LINKS = 1000;

/** The page size for listing; `MAX_PAGE_SIZE` in the repository. */
const PAGE_SIZE = 200;

/** How many numbered copies of one name to try before giving up. */
const MAX_COPIES = 99;

export const guestLinkSchema = z.object({
  /** The greeting, as the guest sees it: `Rahul Sharma`. */
  name: z.string().trim().min(1).max(40),
  /** The link's last path segment, URL-encoded: `Rahul-Sharma-2`. */
  segment: z.string().min(1).max(400),
});

export type GuestLinkPayload = z.infer<typeof guestLinkSchema>;
export type GuestLinkDocument = StoredDocument<GuestLinkPayload>;

/** The repository for one wedding's links. Opens no connection. */
function guestLinksOf(weddingId: string) {
  return createRepository({
    collection: `weddings/${weddingId}/${GUEST_LINK_COLLECTION}`,
    schema: guestLinkSchema,
  });
}

/** The document id for a link key: 64 hex characters. */
export function guestLinkId(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * The wedding's links, newest first. Served by the `guestLinks`
 * `(deletedAt, createdAt)` index. Pages through the cursor up to
 * `MAX_GUEST_LINKS`.
 */
export async function listGuestLinks(weddingId: string): Promise<GuestLinkDocument[]> {
  const repository = guestLinksOf(weddingId);
  const links: GuestLinkDocument[] = [];
  let cursor: string | undefined;
  do {
    const page = await repository.list({
      limit: PAGE_SIZE,
      ...(cursor !== undefined && { cursor }),
    });
    links.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && links.length < MAX_GUEST_LINKS);
  return links;
}

/**
 * Erases every link of a wedding, deleted ones too, for good. Only for the
 * admin's "Clear test data", on a wedding that is erased next (ADR-0015).
 * Returns how many it erased.
 */
export async function eraseGuestLinks(weddingId: string): Promise<number> {
  const repository = guestLinksOf(weddingId);
  let erased = 0;
  for (;;) {
    // Each pass reads the first page again: the previous page is gone.
    const page = await repository.list({ limit: PAGE_SIZE, includeDeleted: true });
    for (const link of page.items) {
      // eslint-disable-next-line data-safety/no-permanent-delete -- admin erasing a deleted test invite (ADR-0015)
      await repository.hardDelete(link.id);
      erased += 1;
    }
    if (page.nextCursor === null || page.items.length === 0) return erased;
  }
}

/**
 * Whether the guest segment of an invite link was deleted by the couple.
 * `false` for a link the dashboard never made, so a hand-typed name keeps
 * working.
 */
export async function isGuestLinkDeleted(weddingId: string, segment: string): Promise<boolean> {
  const key = guestLinkKey(segment);
  if (key === null) return false;
  const link = await guestLinksOf(weddingId).get(guestLinkId(key), { includeDeleted: true });
  return link !== null && link.deletedAt !== null;
}

/** The outcome of a dashboard guest-link change. */
export type GuestLinkResult =
  | { ok: true; link: GuestLinkPayload }
  | { ok: false; reason: 'not-found' | 'invalid' | 'full'; message: string };

/** The wedding at `slug`, when the caller owns it. A stranger gets `null`. */
async function ownedWedding(
  slug: string,
  callerPhoneE164: string | null,
): Promise<WeddingDocument | null> {
  const wedding = await getWeddingBySlug(slug);
  if (wedding === null || !canEditWedding(callerPhoneE164, wedding.ownerPhoneE164)) return null;
  return wedding;
}

const NOT_YOURS = {
  ok: false,
  reason: 'not-found',
  message: 'This site is not on your number.',
} as const;

/**
 * Makes a guest's link. The caller's phone number comes from the verified
 * session. A second guest of the same name gets the next number: `Rahul`,
 * `Rahul-2`, `Rahul-3`.
 */
export async function createGuestLink(
  slug: string,
  callerPhoneE164: string | null,
  rawName: string,
): Promise<GuestLinkResult> {
  const wedding = await ownedWedding(slug, callerPhoneE164);
  if (wedding === null) return NOT_YOURS;

  const name = parseGuestName(rawName);
  if (name === null) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Use letters and spaces only, up to 40 characters.',
    };
  }

  const repository = guestLinksOf(wedding.id);
  if ((await repository.count()) >= MAX_GUEST_LINKS) {
    return {
      ok: false,
      reason: 'full',
      message: `A site can have ${MAX_GUEST_LINKS} guest links. Delete one to add another.`,
    };
  }

  return repository.runTransaction(async (linksTx) => {
    // All reads before the write: try `Rahul`, then `Rahul-2`, and so on.
    for (let copy = 1; copy <= MAX_COPIES; copy += 1) {
      const segment = guestLinkSegment(name, copy);
      const key = guestLinkKey(segment);
      if (key === null) break;
      const id = guestLinkId(key);
      // A deleted link keeps its id: `get` inside a transaction sees it.
      if ((await linksTx.get(id)) !== null) continue;
      // `tx.create`: if another tap took this id first, the transaction
      // retries and moves on to the next number.
      linksTx.createWithId(id, { name, segment });
      return { ok: true as const, link: { name, segment } };
    }
    return {
      ok: false as const,
      reason: 'full' as const,
      message: `There are already ${MAX_COPIES} links for ${name}. Add a surname to tell them apart.`,
    };
  });
}

/**
 * Deletes a guest's link. The guest who opens it afterwards sees the couple's
 * general invite. A soft delete: `docs/data-recovery.md` brings it back.
 */
export async function deleteGuestLink(
  slug: string,
  callerPhoneE164: string | null,
  linkId: string,
): Promise<{ ok: true } | { ok: false; reason: 'not-found'; message: string }> {
  const wedding = await ownedWedding(slug, callerPhoneE164);
  if (wedding === null) return NOT_YOURS;
  // The id is looked up under the caller's own wedding, so it can never
  // reach another couple's link.
  if (!/^[0-9a-f]{64}$/.test(linkId)) {
    return { ok: false, reason: 'not-found', message: 'This link is already gone.' };
  }
  const repository = guestLinksOf(wedding.id);
  if ((await repository.get(linkId)) === null) {
    return { ok: false, reason: 'not-found', message: 'This link is already gone.' };
  }
  await repository.softDelete(linkId);
  return { ok: true };
}

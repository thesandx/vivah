import 'server-only';

import { FieldValue } from '@google-cloud/firestore';

import { slugProblem } from '@/lib/couple-slug';
import { PREVIEW_LIFETIME_SECONDS } from '@/lib/preview-cookie';
import { parseWeddingDetails, type WeddingDetails } from '@/lib/wedding-details';
import {
  type AdminAction,
  recordAdminAction,
  recordAdminActionIn,
} from '@/services/admin-audit.service';
import { type LeadDocument, leads } from '@/services/lead.service';
import { MAX_PAGE_SIZE, type Repository, type StoredDocument } from '@/services/repository';
import {
  slugClaimId,
  slugClaims,
  weddingAtSlugQuery,
  type WeddingDocument,
  weddings,
  type WeddingStatus,
} from '@/services/wedding.service';

/**
 * What `/admin` does to the data: list everything, edit a wedding, pause it,
 * move it to a new address, delete and restore it, and reactivate a preview.
 *
 * Every function takes the admin's uid, from `requireAdmin()`, and writes an
 * entry to the audit log. Deletes are soft. The one permanent delete is a
 * slug claim, which is a lock, not data: see `deleteWedding`.
 */

/** The most rows an admin list loads. Far above today's volume. */
export const ADMIN_LIST_CAP = 2000;

/** A whole collection, deleted rows included, up to `ADMIN_LIST_CAP`. */
async function loadAll<T extends Record<string, unknown>>(
  repo: Repository<T>,
): Promise<{ items: StoredDocument<T>[]; capped: boolean }> {
  const items: StoredDocument<T>[] = [];
  let cursor: string | undefined;
  do {
    const page = await repo.list({
      limit: MAX_PAGE_SIZE,
      includeDeleted: true,
      ...(cursor !== undefined && { cursor }),
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && items.length < ADMIN_LIST_CAP);
  return { items, capped: cursor !== undefined };
}

export async function listAllWeddings(): Promise<{
  items: WeddingDocument[];
  capped: boolean;
}> {
  return loadAll(weddings);
}

export async function listAllLeads(): Promise<{ items: LeadDocument[]; capped: boolean }> {
  return loadAll(leads);
}

/** A wedding by id, deleted or not. */
export async function getWeddingForAdmin(id: string): Promise<WeddingDocument | null> {
  return isDocumentId(id) ? weddings.get(id, { includeDeleted: true }) : null;
}

/** A lead by id, deleted or not. */
export async function getLeadForAdmin(id: string): Promise<LeadDocument | null> {
  return isDocumentId(id) ? leads.get(id, { includeDeleted: true }) : null;
}

/** A Firestore auto id. Checked before a read, so junk never reaches Firestore. */
function isDocumentId(id: string): boolean {
  return /^[A-Za-z0-9]{20}$/.test(id);
}

/** The outcome of an admin change. `message` is shown to the admin. */
export type AdminResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: Partial<Record<keyof WeddingDetails, string>> };

function audit(
  action: AdminAction,
  targetType: 'wedding' | 'lead',
  targetId: string,
  detail: string,
  adminUid: string,
): Promise<void> {
  return recordAdminAction({ action, targetType, targetId, detail, adminUid });
}

const NOT_FOUND: AdminResult = { ok: false, message: 'That record no longer exists.' };

/** Saves the invite details: names, date, time and venue. */
export async function editWeddingDetails(
  id: string,
  form: Record<string, unknown>,
  adminUid: string,
): Promise<AdminResult> {
  const wedding = await getWeddingForAdmin(id);
  if (wedding === null) return NOT_FOUND;
  const parsed = parseWeddingDetails(form);
  if (!parsed.ok) {
    return { ok: false, message: 'Some details need a fix.', errors: parsed.errors };
  }
  await weddings.update(id, parsed.details);
  const changed = (Object.keys(parsed.details) as (keyof WeddingDetails)[]).filter(
    (key) => (wedding[key] ?? null) !== parsed.details[key],
  );
  await audit(
    'wedding-edited',
    'wedding',
    id,
    changed.length === 0
      ? `Saved ${wedding.slug} with no change.`
      : `Changed ${changed.join(', ')} on ${wedding.slug}.`,
    adminUid,
  );
  return { ok: true, message: 'Saved. Guests see the change now.' };
}

/**
 * Changes the couple's WhatsApp number: the RSVP button's number and the
 * couple's dashboard login. The audit entry does not name either number.
 */
export async function changeWeddingPhone(
  id: string,
  phoneE164: string,
  adminUid: string,
): Promise<AdminResult> {
  if (!/^\+\d{8,15}$/.test(phoneE164)) {
    return { ok: false, message: 'Enter the number with its country code, like +919876543210.' };
  }
  const wedding = await getWeddingForAdmin(id);
  if (wedding === null) return NOT_FOUND;
  if (wedding.ownerPhoneE164 === phoneE164)
    return { ok: true, message: 'That is already the number.' };
  await weddings.update(id, { ownerPhoneE164: phoneE164 });
  await audit(
    'wedding-phone-changed',
    'wedding',
    id,
    `Changed the couple's number on ${wedding.slug}.`,
    adminUid,
  );
  return { ok: true, message: 'Number changed. The couple signs in with the new one.' };
}

/** Pauses an invite (guests see "not available") or makes it live again. */
export async function setWeddingStatus(
  id: string,
  status: WeddingStatus,
  adminUid: string,
): Promise<AdminResult> {
  const wedding = await getWeddingForAdmin(id);
  if (wedding === null) return NOT_FOUND;
  await weddings.update(id, { status });
  await audit(
    status === 'unavailable' ? 'wedding-paused' : 'wedding-resumed',
    'wedding',
    id,
    `${status === 'unavailable' ? 'Made unavailable' : 'Made live again'}: ${wedding.slug}.`,
    adminUid,
  );
  return {
    ok: true,
    message:
      status === 'unavailable'
        ? 'Guests now see "This invite is not available right now".'
        : 'The invite is live again.',
  };
}

/**
 * Moves a wedding to a new address, in one transaction: claims the new slug,
 * updates the wedding and its lead, and frees the old slug. Every link
 * already shared with the old address stops working.
 */
export async function changeWeddingAddress(
  id: string,
  newSlug: string,
  adminUid: string,
): Promise<AdminResult> {
  const problem = slugProblem(newSlug);
  if (problem !== null) return { ok: false, message: problem };

  return weddings.runTransaction(async (weddingsTx, tx) => {
    const claimsTx = slugClaims.inTransaction(tx);
    const leadsTx = leads.inTransaction(tx);

    const wedding = await weddingsTx.get(id);
    if (wedding === null || wedding.deletedAt !== null) return NOT_FOUND;
    if (wedding.slug === newSlug)
      return { ok: true, message: 'That is already the address.' } as AdminResult;
    const newClaim = await claimsTx.get(slugClaimId(newSlug));
    const existing = await tx.get(weddingAtSlugQuery(newSlug));
    const oldClaim = await claimsTx.get(slugClaimId(wedding.slug));
    const lead = await leadsTx.get(wedding.leadId);
    if (newClaim !== null || !existing.empty) {
      return { ok: false, message: `${newSlug} is taken. Pick another address.` } as AdminResult;
    }

    claimsTx.createWithId(slugClaimId(newSlug), {
      slug: newSlug,
      weddingId: id,
      leadId: wedding.leadId,
    });
    weddingsTx.update(id, { slug: newSlug });
    if (lead !== null) leadsTx.update(wedding.leadId, { weddingSlug: newSlug });
    if (oldClaim !== null && oldClaim.weddingId === id) {
      // A claim is a lock on an address, not a record of anything: the
      // wedding keeps its history. Freeing the old address needs it gone,
      // because `createWithId` refuses an id that exists, deleted or not.
      // eslint-disable-next-line data-safety/no-permanent-delete -- releasing a slug lock; the wedding itself is updated, not deleted
      tx.delete(slugClaims.ref().doc(slugClaimId(wedding.slug)));
    }
    recordAdminActionIn(tx, {
      action: 'wedding-address-changed',
      targetType: 'wedding',
      targetId: id,
      detail: `Moved ${wedding.slug} to ${newSlug}.`,
      adminUid,
    });
    return {
      ok: true,
      message: `Moved to ${newSlug}. Old links no longer open the invite.`,
    } as AdminResult;
  });
}

/**
 * Soft-deletes a wedding and frees its address, in one transaction. Guests
 * see "no invite at this address", and another couple can publish there.
 * The wedding keeps every field and shows in the Deleted tab, so
 * `restoreWedding` can bring it back at any address that is free then.
 */
export async function deleteWedding(id: string, adminUid: string): Promise<AdminResult> {
  return weddings.runTransaction(async (weddingsTx, tx) => {
    const claimsTx = slugClaims.inTransaction(tx);
    const wedding = await weddingsTx.get(id);
    if (wedding === null || wedding.deletedAt !== null) return NOT_FOUND;
    const claim = await claimsTx.get(slugClaimId(wedding.slug));
    tx.update(weddings.ref().doc(id), {
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (claim !== null && claim.weddingId === id) {
      // A claim is a lock on an address, not a record of anything: the
      // wedding keeps its history. Freeing the address needs it gone,
      // because `createWithId` refuses an id that exists, deleted or not.
      // eslint-disable-next-line data-safety/no-permanent-delete -- releasing a slug lock; the wedding itself is soft-deleted, not erased
      tx.delete(slugClaims.ref().doc(slugClaimId(wedding.slug)));
    }
    recordAdminActionIn(tx, {
      action: 'wedding-deleted',
      targetType: 'wedding',
      targetId: id,
      detail: `Deleted ${wedding.slug} and freed the address.`,
      adminUid,
    });
    return {
      ok: true,
      message: `Deleted. ${wedding.slug} is free for another couple now.`,
    } as AdminResult;
  });
}

/**
 * Restores a deleted wedding at `newSlug`, which must be free: no claim by
 * another wedding and no live wedding there. Its old address is fine when it
 * is still free. Updates the lead too, so the couple's preview link points to
 * the new address.
 */
export async function restoreWedding(
  id: string,
  newSlug: string,
  adminUid: string,
): Promise<AdminResult> {
  const problem = slugProblem(newSlug);
  if (problem !== null) return { ok: false, message: problem };

  return weddings.runTransaction(async (weddingsTx, tx) => {
    const claimsTx = slugClaims.inTransaction(tx);
    const leadsTx = leads.inTransaction(tx);
    const wedding = await weddingsTx.get(id);
    if (wedding === null) return NOT_FOUND;
    if (wedding.deletedAt === null)
      return { ok: true, message: 'It is not deleted.' } as AdminResult;
    const claim = await claimsTx.get(slugClaimId(newSlug));
    const existing = await tx.get(weddingAtSlugQuery(newSlug));
    const lead = await leadsTx.get(wedding.leadId);
    if ((claim !== null && claim.weddingId !== id) || !existing.empty) {
      return { ok: false, message: `${newSlug} is taken. Pick another address.` } as AdminResult;
    }
    if (claim === null) {
      claimsTx.createWithId(slugClaimId(newSlug), {
        slug: newSlug,
        weddingId: id,
        leadId: wedding.leadId,
      });
    }
    tx.update(weddings.ref().doc(id), {
      slug: newSlug,
      deletedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (lead !== null && lead.weddingSlug !== newSlug) {
      leadsTx.update(wedding.leadId, { weddingSlug: newSlug });
    }
    recordAdminActionIn(tx, {
      action: 'wedding-restored',
      targetType: 'wedding',
      targetId: id,
      detail:
        wedding.slug === newSlug
          ? `Restored at ${newSlug}.`
          : `Restored at ${newSlug} (was ${wedding.slug}).`,
      adminUid,
    });
    return {
      ok: true,
      message: `Restored at ${newSlug}. Send the couple the link.`,
    } as AdminResult;
  });
}

/**
 * Frees the address of a wedding deleted BEFORE delete freed it on its own.
 * A wedding deleted now has no claim left, so this is a no-op for it.
 */
export async function releaseWeddingAddress(id: string, adminUid: string): Promise<AdminResult> {
  return weddings.runTransaction(async (weddingsTx, tx) => {
    const claimsTx = slugClaims.inTransaction(tx);
    const wedding = await weddingsTx.get(id);
    if (wedding === null) return NOT_FOUND;
    if (wedding.deletedAt === null) {
      return {
        ok: false,
        message: 'Delete the invite before you release its address.',
      } as AdminResult;
    }
    const claim = await claimsTx.get(slugClaimId(wedding.slug));
    if (claim === null || claim.weddingId !== id) {
      return { ok: true, message: 'The address is already free.' } as AdminResult;
    }
    // eslint-disable-next-line data-safety/no-permanent-delete -- releasing a slug lock on an admin's request; the wedding stays soft-deleted
    tx.delete(slugClaims.ref().doc(slugClaimId(wedding.slug)));
    recordAdminActionIn(tx, {
      action: 'wedding-address-released',
      targetType: 'wedding',
      targetId: id,
      detail: `Released the address ${wedding.slug}.`,
      adminUid,
    });
    return { ok: true, message: `${wedding.slug} is free for another couple now.` } as AdminResult;
  });
}

/** True while a deleted wedding still holds its address (deleted before delete freed it). */
export async function weddingHoldsAddress(wedding: WeddingDocument): Promise<boolean> {
  const claim = await slugClaims.get(slugClaimId(wedding.slug));
  return claim !== null && claim.weddingId === wedding.id;
}

/**
 * Reactivates a preview: a fresh 48 hours, and the link is no longer tied to
 * the first phone, so the next phone to open it gets it. For a couple whose
 * link expired, or who changed phones.
 */
export async function reactivatePreview(
  id: string,
  adminUid: string,
  now: Date = new Date(),
): Promise<AdminResult> {
  const lead = await getLeadForAdmin(id);
  if (lead === null || lead.deletedAt !== null) return NOT_FOUND;
  if (lead.status === 'paid') {
    return { ok: false, message: 'This couple has paid. Their invite is live, not a preview.' };
  }
  await leads.update(id, {
    expiresAt: new Date(now.getTime() + PREVIEW_LIFETIME_SECONDS * 1000),
    previewTokenHash: null,
    firstOpenedAt: null,
    status: 'preview-sent',
  });
  await audit(
    'preview-reactivated',
    'lead',
    id,
    `Reactivated the preview for ${lead.bride} & ${lead.groom}.`,
    adminUid,
  );
  return { ok: true, message: 'Reactivated for 48 hours. Send the link again.' };
}

export async function deleteLead(id: string, adminUid: string): Promise<AdminResult> {
  const lead = await getLeadForAdmin(id);
  if (lead === null || lead.deletedAt !== null) return NOT_FOUND;
  await leads.softDelete(id);
  await audit(
    'preview-deleted',
    'lead',
    id,
    `Deleted the preview for ${lead.bride} & ${lead.groom}.`,
    adminUid,
  );
  return { ok: true, message: 'Deleted. The preview link no longer opens.' };
}

export async function restoreLead(id: string, adminUid: string): Promise<AdminResult> {
  const lead = await getLeadForAdmin(id);
  if (lead === null) return NOT_FOUND;
  if (lead.deletedAt === null) return { ok: true, message: 'It is not deleted.' };
  await leads.restore(id);
  await audit(
    'preview-restored',
    'lead',
    id,
    `Restored the preview for ${lead.bride} & ${lead.groom}.`,
    adminUid,
  );
  return { ok: true, message: 'Restored.' };
}

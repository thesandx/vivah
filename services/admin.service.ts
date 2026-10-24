import 'server-only';

import { FieldValue } from '@google-cloud/firestore';

import { slugProblem } from '@/lib/couple-slug';
import { type AppliedCoupon, normalizeCouponCode } from '@/lib/coupons';
import { PREVIEW_LIFETIME_SECONDS } from '@/lib/preview-cookie';
import { ERASE_LIMIT, liveLeadIds } from '@/lib/test-data-cleanup';
import { parseWeddingDetails, type WeddingDetails } from '@/lib/wedding-details';
import {
  cleanFunctionKinds,
  FESTIVITY_LABELS,
  type FunctionKind,
  parseWeddingFunctions,
} from '@/lib/wedding-functions';
import type { SongSlot } from '@/lib/wedding-songs';
import {
  type AdminAction,
  recordAdminAction,
  recordAdminActionIn,
} from '@/services/admin-audit.service';
import { findCoupon } from '@/services/coupon.service';
import { eraseGuestLinks } from '@/services/guest-link.service';
import { type LeadDocument, leads } from '@/services/lead.service';
import { MAX_PAGE_SIZE, type Repository, type StoredDocument } from '@/services/repository';
import {
  getWeddingBySlug,
  slugClaimId,
  slugClaims,
  weddingAtSlugQuery,
  type WeddingDocument,
  weddings,
  type WeddingStatus,
  writePublish,
} from '@/services/wedding.service';
import { songInSlot } from '@/services/wedding-songs.service';

/**
 * What `/admin` does to the data: list everything, edit a wedding, pause it,
 * move it to a new address, delete and restore it, reactivate a preview,
 * make a preview live without a payment, and change its song.
 *
 * Every function takes the admin's uid, from `requireAdmin()`, and writes an
 * entry to the audit log. Deletes are soft. Two things are permanent: a
 * slug claim, which is a lock, not data (see `deleteWedding`), and the
 * "Clear test data" erase, which the admin asks for row by row (see
 * `eraseTestData`, ADR-0016).
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
  | {
      ok: false;
      message: string;
      errors?: Partial<Record<keyof WeddingDetails, string>>;
      /** Problems keyed by form field name, for the functions form. */
      fieldErrors?: Record<string, string>;
    };

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

/** The functions as words, for an audit entry: `haldi, reception` or `none`. */
function kindList(kinds: readonly FunctionKind[]): string {
  return kinds.length === 0 ? 'none' : kinds.join(', ');
}

/**
 * Saves the functions besides the wedding, with their dates and venues, as
 * the couple's dashboard does.
 */
export async function editWeddingFunctions(
  id: string,
  form: Record<string, unknown>,
  adminUid: string,
): Promise<AdminResult> {
  const wedding = await getWeddingForAdmin(id);
  if (wedding === null) return NOT_FOUND;
  const parsed = parseWeddingFunctions(form);
  if (!parsed.ok) {
    return { ok: false, message: 'Some details need a fix.', fieldErrors: parsed.errors };
  }
  await weddings.update(id, { functions: parsed.functions });
  await audit(
    'wedding-functions-edited',
    'wedding',
    id,
    `Saved the functions on ${wedding.slug}: ${kindList(parsed.functions.map((entry) => entry.kind))}.`,
    adminUid,
  );
  return { ok: true, message: 'Saved. Guests see the functions now.' };
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
 * Reactivates a preview: the link works for a fresh 48 hours, and the next
 * open starts a fresh 30 minutes. It is also no longer tied to the first
 * phones, so the next phones to open it may publish. For a couple whose
 * preview closed, or who changed phones. ADR-0010.
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
    viewEndsAt: null,
    previewTokenHash: null,
    secondTokenHash: null,
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
  return {
    ok: true,
    message: 'Reactivated. The next open starts a fresh 30 minutes. Send the link again.',
  };
}

/**
 * Makes a preview live at `slug` with no payment through the site: for a
 * couple who paid another way (UPI to the business number, cash), or who
 * gets the invite free. The same writes as a paid publish (`writePublish`),
 * in one transaction: the wedding, the claim on the address, and the lead
 * marked paid. So the live site has no watermark and no timer, like any
 * other.
 *
 * It sets no `paidAt` or `paymentId`: no payment document exists, and the
 * purchase conversion counts only real payments. The audit entry is the
 * record that an admin did it. A lead that paid already but lost its address
 * to another couple keeps its payment fields and goes live here too.
 *
 * The preview's expiry and timer do not matter: the admin decides.
 */
export async function makePreviewLive(
  id: string,
  slug: string,
  adminUid: string,
  couponCode = '',
): Promise<AdminResult> {
  const problem = slugProblem(slug);
  if (problem !== null) return { ok: false, message: problem };
  if (!isDocumentId(id)) return NOT_FOUND;
  // A coupon the couple used off the site, so its referral counts. On or
  // off: an admin may honour a code that has just ended. ADR-0015.
  let coupon: AppliedCoupon | null = null;
  if (normalizeCouponCode(couponCode) !== '') {
    const found = await findCoupon(couponCode);
    if (found === null) {
      return {
        ok: false,
        message: `No coupon has the code ${normalizeCouponCode(couponCode)}. Leave it empty, or make it in Coupons first.`,
      };
    }
    coupon = { code: found.code, percentOff: found.percentOff };
  }

  return slugClaims.runTransaction(async (claimsTx, tx) => {
    // All reads first: a Firestore transaction refuses a read after a write.
    const lead = await leads.inTransaction(tx).get(id);
    const claim = await claimsTx.get(slugClaimId(slug));
    const existing = await tx.get(weddingAtSlugQuery(slug));
    if (lead === null || lead.deletedAt !== null) return NOT_FOUND;
    if (lead.weddingSlug !== undefined) {
      return {
        ok: false,
        message: `It is live already, at ${lead.weddingSlug}.`,
      } as AdminResult;
    }
    if (claim !== null || !existing.empty) {
      return { ok: false, message: `${slug} is taken. Pick another address.` } as AdminResult;
    }
    writePublish(tx, lead, slug, coupon === null ? {} : { coupon });
    recordAdminActionIn(tx, {
      action: 'preview-made-live',
      targetType: 'lead',
      targetId: id,
      detail: `Made ${lead.bride} & ${lead.groom} live at ${slug} with no payment on the site${
        coupon === null ? '' : `, with coupon ${coupon.code}`
      }.`,
      adminUid,
    });
    return {
      ok: true,
      message: `Live at ${slug}. Send the couple the welcome message.`,
    } as AdminResult;
  });
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

/**
 * Changes which functions a preview shows. A preview has kinds only, no
 * dates. Once the couple has paid, the live invite's functions are edited
 * on the invite's own page instead, so this leaves the wedding alone.
 */
export async function changePreviewFunctions(
  id: string,
  values: readonly unknown[],
  adminUid: string,
): Promise<AdminResult> {
  const lead = await getLeadForAdmin(id);
  if (lead === null || lead.deletedAt !== null) return NOT_FOUND;
  const kinds = cleanFunctionKinds(values);
  await leads.update(id, { functions: kinds });
  await audit(
    'preview-functions-changed',
    'lead',
    id,
    `Set the functions for ${lead.bride} & ${lead.groom} to ${kindList(kinds)}.`,
    adminUid,
  );
  return {
    ok: true,
    message:
      kinds.length === 0
        ? 'The preview shows no functions now.'
        : `The preview now shows ${kinds.map((kind) => FESTIVITY_LABELS[kind].name).join(', ')}.`,
  };
}

/**
 * Sets a preview's song to one on the admin's list. When the couple has paid,
 * the live invite gets the same song, so the two never disagree. Like the
 * dashboard, it stores `{ name, file }` copied from the list, never a file the
 * caller names.
 */
export async function changePreviewSong(
  id: string,
  slot: SongSlot,
  adminUid: string,
): Promise<AdminResult> {
  const lead = await getLeadForAdmin(id);
  if (lead === null || lead.deletedAt !== null) return NOT_FOUND;
  const song = await songInSlot(slot);
  if (song === null) {
    return { ok: false, message: 'That song is no longer on the list. Choose another.' };
  }
  await leads.update(id, { song });
  const wedding = lead.weddingSlug === undefined ? null : await getWeddingBySlug(lead.weddingSlug);
  const live = wedding !== null && wedding.leadId === id;
  if (live) await weddings.update(wedding.id, { song });
  await audit(
    'preview-song-changed',
    'lead',
    id,
    `Changed the song for ${lead.bride} & ${lead.groom} to ${song.name}${live ? ', on the live invite too' : ''}.`,
    adminUid,
  );
  return {
    ok: true,
    message: live
      ? `${song.name} is now the song on the preview and the live invite.`
      : `${song.name} is now the preview's song.`,
  };
}

/** What `eraseTestData` did, for the admin's message. */
export interface EraseResult {
  erasedLeads: number;
  erasedWeddings: number;
  /** Rows it refused: a live invite or its preview. */
  kept: number;
}

/**
 * Erases test rows for good, on the admin's request (ADR-0016): previews
 * (`leads`) and DELETED invites (`weddings`, with their guest links and any
 * claim they still hold on an address).
 *
 * It refuses a live invite, and the preview of a live invite: only a
 * deleted invite can go, so a paid couple's site never vanishes from here.
 * It keeps every `payments` document, which is the record for accounting
 * and refunds, and the audit log, which gets one entry per erased row.
 *
 * Not one transaction: each row is erased on its own, so a failure part way
 * leaves the rest as they were, and running it again finishes the job.
 * Point-in-time recovery keeps 7 days (docs/data-recovery.md).
 */
export async function eraseTestData(
  leadIds: readonly string[],
  weddingIds: readonly string[],
  adminUid: string,
): Promise<EraseResult> {
  const result: EraseResult = { erasedLeads: 0, erasedWeddings: 0, kept: 0 };

  for (const id of weddingIds.slice(0, ERASE_LIMIT)) {
    const wedding = await getWeddingForAdmin(id);
    if (wedding === null) continue;
    if (wedding.deletedAt === null) {
      result.kept += 1;
      continue;
    }
    const claim = await slugClaims.get(slugClaimId(wedding.slug));
    if (claim !== null && claim.weddingId === id) {
      // eslint-disable-next-line data-safety/no-permanent-delete -- admin erasing test data (ADR-0016); a claim is a lock, not data
      await slugClaims.hardDelete(slugClaimId(wedding.slug));
    }
    // The guest links first: a subcollection outlives its parent document.
    await eraseGuestLinks(id);
    // eslint-disable-next-line data-safety/no-permanent-delete -- admin erasing a deleted test invite, row by row (ADR-0016)
    await weddings.hardDelete(id);
    result.erasedWeddings += 1;
    await audit(
      'test-data-erased',
      'wedding',
      id,
      `Erased the deleted invite ${wedding.slug} (${wedding.bride} & ${wedding.groom}) for good.`,
      adminUid,
    );
  }

  // Read after the weddings are gone, so a lead whose only invite was just
  // erased counts as not live.
  const live = liveLeadIds((await listAllWeddings()).items);
  for (const id of leadIds.slice(0, ERASE_LIMIT)) {
    const lead = await getLeadForAdmin(id);
    if (lead === null) continue;
    if (live.has(id)) {
      result.kept += 1;
      continue;
    }
    // eslint-disable-next-line data-safety/no-permanent-delete -- admin erasing a test preview, row by row (ADR-0016)
    await leads.hardDelete(id);
    result.erasedLeads += 1;
    await audit(
      'test-data-erased',
      'lead',
      id,
      `Erased the preview for ${lead.bride} & ${lead.groom} for good.`,
      adminUid,
    );
  }

  return result;
}

import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { NAME_ORDERS } from '@/lib/couple-names';
import { nameOrderFromSlug } from '@/lib/couple-slug';
import { appliedCouponSchema } from '@/lib/coupons';
import { capitalizeName } from '@/lib/guest-name';
import type { LeadRequest } from '@/lib/lead-schema';
import { PREVIEW_LIFETIME_SECONDS } from '@/lib/preview-cookie';
import { previewClosed, timerStarted, viewEndsAtFrom } from '@/lib/preview-timer';
import { FUNCTION_KINDS } from '@/lib/wedding-functions';
import { type ChosenSong, chosenSongSchema } from '@/lib/wedding-songs';
import { createRepository, type StoredDocument } from '@/services/repository';

/**
 * Leads: a couple who typed their names on the home page and has not paid yet.
 *
 * One document per form submission, under an auto-generated id. That id is
 * also the preview link (`/p/<id>`): Firestore generates 20 random characters,
 * about 119 bits, so nobody can guess a link they were not sent. The PRD keys
 * leads by phone; an auto id is used instead because the repository refuses a
 * caller-chosen id of that shape (see `lib/document-ids.ts`), and because one
 * phone may start more than one preview.
 *
 * A phone number is personal data. It is stored, because the WhatsApp step
 * needs it, and it is never logged.
 */

export const LEAD_COLLECTION = 'leads';

export const LEAD_STATUSES = ['preview-sent', 'opened', 'paid'] as const;

export const leadSchema = z.object({
  /** Read through `capitalizeName`, so a name saved as `riya` shows as `Riya`. */
  bride: z.string().trim().min(1).max(60).transform(capitalizeName),
  groom: z.string().trim().min(1).max(60).transform(capitalizeName),
  /** `YYYY-MM-DD`, or `null` for "I'll add this later". */
  weddingDate: z.iso.date().nullable(),
  /** E.164, from `toE164`. Never logged. */
  phoneE164: z.string().regex(/^\+\d{8,15}$/),
  status: z.enum(LEAD_STATUSES),
  /**
   * When the couple asked for the preview, with the note "we will send your
   * link to this number on WhatsApp" in view. That is the WhatsApp opt-in.
   * (Leads before 17 Oct 2026 ticked a box instead.)
   */
  consentAt: z.date(),
  /**
   * An unopened preview link stops working after this instant. Once the link
   * opens, `viewEndsAt` decides instead.
   */
  expiresAt: z.date(),
  /**
   * When the preview's 30 minutes end, for every browser. Set the first time
   * the link opens; an admin's reactivate clears it, so the next open starts
   * a fresh 30 minutes. Optional: older leads do not have it. ADR-0010.
   */
  viewEndsAt: z.date().nullable().optional(),
  /**
   * SHA-256 of the token in the first browser's cookie, or `null` until the
   * link is opened. The hash, not the token: a database export must not be
   * enough to open somebody's preview.
   */
  previewTokenHash: z.string().length(64).nullable(),
  /**
   * SHA-256 of the token in the SECOND browser's cookie. The sign-up card
   * opens the preview on screen, and the WhatsApp link usually opens in
   * another browser (WhatsApp's own, or the phone when sign-up was on a
   * laptop). So a preview opens in two browsers, then locks. Optional and
   * nullable: older leads do not have it, and it stays `null` until used.
   */
  secondTokenHash: z.string().length(64).nullable().optional(),
  firstOpenedAt: z.date().nullable(),
  /**
   * The address the couple published at, set with `status: 'paid'`. Optional
   * because leads written before publishing existed do not have it.
   */
  weddingSlug: z.string().optional(),
  /**
   * When Cashfree reported the payment, and the `payments` document that
   * holds it (order id, amount). Set with `status: 'paid'` by a real payment;
   * absent for a test payment and for older leads. A paid lead without a
   * `weddingSlug` paid for an address another couple took first: it picks
   * another on the preview page, free. ADR-0011.
   */
  paidAt: z.date().optional(),
  paymentId: z.string().optional(),
  /**
   * The coupon the couple paid with, or the one the admin named on "Make
   * live". Set with `status: 'paid'`. `/admin` > Coupons counts the uses of
   * each code from it, for a referral cashback. ADR-0015.
   */
  coupon: appliedCouponSchema.optional(),
  /**
   * The address the couple chose on the sign-up card. A wish, not a claim:
   * publishing reserves it, or the preview page offers others if it was
   * taken meanwhile. Optional because older leads do not have it.
   */
  desiredSlug: z.string().optional(),
  /**
   * The Google Ads click id from the sign-up card, when the couple came
   * from an ad (ADR-0013). Matches a payment made in another browser to
   * the ad, by an upload. Never queried, so it needs no index.
   */
  gclid: z.string().max(200).optional(),
  /**
   * The song the couple chose on the sign-up card, copied from the admin's
   * list so a later change there does not change it. Optional: older leads
   * and a card with no songs have none.
   */
  song: chosenSongSchema.optional(),
  /**
   * The functions besides the wedding the couple is having, chosen on the
   * sign-up card: kinds only, no dates. The preview shows a card for each;
   * publishing copies them to the wedding. Optional: older leads, and a
   * couple who skipped the step, have none.
   */
  functions: z.array(z.enum(FUNCTION_KINDS)).max(FUNCTION_KINDS.length).optional(),
  /**
   * Whose name the preview shows first. Read from the address the couple
   * chose on the sign-up card (`rahul-priya` puts the groom first), and an
   * admin can change it on `/admin/previews/<id>`. Publishing copies it to
   * the wedding. Optional:
   * absent means the bride's name first (`lib/couple-names.ts`).
   */
  nameOrder: z.enum(NAME_ORDERS).optional(),
});

export type LeadPayload = z.infer<typeof leadSchema>;
export type LeadDocument = StoredDocument<LeadPayload>;

export const leads = createRepository({ collection: LEAD_COLLECTION, schema: leadSchema });

/** A Firestore auto id: 20 characters of base62. Checked before any read. */
const AUTO_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export function isLeadId(value: string): boolean {
  return AUTO_ID_PATTERN.test(value);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** True when `token` is the one whose hash the lead stores. Constant-time. */
export function tokenMatches(token: string | undefined, storedHash: string): boolean {
  if (token === undefined || token === '') return false;
  const presented = Buffer.from(hashToken(token), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}

/** True when `token` opens this lead: it is the first or the second browser's. */
export function leadTokenMatches(
  token: string | undefined,
  lead: Pick<LeadPayload, 'previewTokenHash' | 'secondTokenHash'>,
): boolean {
  return [lead.previewTokenHash, lead.secondTokenHash].some(
    (hash) => typeof hash === 'string' && tokenMatches(token, hash),
  );
}

/** Saves a lead and returns its id, which is also its preview link. */
export async function createLead(
  // `weddingDate` stays nullable here: the sign-up card requires it now, but
  // leads stored before that have none, and the store keeps one shape.
  input: Omit<LeadRequest, 'songSlot' | 'weddingDate' | 'functions'> & {
    weddingDate: string | null;
    functions?: LeadRequest['functions'];
    song?: ChosenSong | null;
  },
  now: Date = new Date(),
): Promise<string> {
  const nameOrder =
    input.slug === null ? null : nameOrderFromSlug(input.slug, input.bride, input.groom);
  return leads.create({
    bride: input.bride,
    groom: input.groom,
    weddingDate: input.weddingDate,
    phoneE164: input.phoneE164,
    status: 'preview-sent',
    consentAt: now,
    expiresAt: new Date(now.getTime() + PREVIEW_LIFETIME_SECONDS * 1000),
    previewTokenHash: null,
    firstOpenedAt: null,
    ...(input.slug !== null && { desiredSlug: input.slug }),
    ...(nameOrder !== null && { nameOrder }),
    ...(input.song !== undefined && input.song !== null && { song: input.song }),
    ...(input.gclid !== undefined && { gclid: input.gclid }),
    ...(input.functions !== undefined &&
      input.functions.length > 0 && { functions: input.functions }),
  });
}

/**
 * What a browser may see of a lead's preview. Anyone with the link sees it
 * while its 30 minutes run; `canPublish` is true only in the two browsers the
 * link is bound to (ADR-0009), because only they may publish (ADR-0007).
 */
export type PreviewAccess =
  | { state: 'ok'; lead: LeadDocument; canPublish: boolean }
  | { state: 'not-found' }
  | { state: 'expired' }
  | { state: 'unopened' };

/**
 * Opens a preview link. The first open starts the preview's 30 minutes.
 *
 * It also binds the link to up to two browsers, for publishing: the FIRST
 * call binds the lead to a new random token and returns it, for the caller to
 * set as a cookie. The first call from another browser binds a second token
 * the same way. A third browser still sees the preview, with no token.
 *
 * A transaction, so two taps on the link at the same moment cannot bind two
 * different browsers or start two timers.
 */
export async function openPreviewLink(
  leadId: string,
  presentedToken: string | undefined,
  now: Date = new Date(),
): Promise<{ access: 'ok' | 'not-found' | 'expired'; newToken: string | null }> {
  if (!isLeadId(leadId)) return { access: 'not-found', newToken: null };

  return leads.runTransaction(async (repo) => {
    const lead = await repo.get(leadId);
    if (lead === null) return { access: 'not-found' as const, newToken: null };
    if (previewClosed(lead, now)) return { access: 'expired' as const, newToken: null };

    const changes: Partial<LeadPayload> = {};
    if (lead.status !== 'paid' && !timerStarted(lead)) {
      const viewEndsAt = viewEndsAtFrom(now);
      changes.viewEndsAt = viewEndsAt;
      // Publishing checks `expiresAt`. Keep it past the 30 minutes, so a link
      // first opened near its end can still be paid for while it shows.
      if (lead.expiresAt.getTime() < viewEndsAt.getTime()) changes.expiresAt = viewEndsAt;
    }

    let newToken: string | null = null;
    if (lead.previewTokenHash === null) {
      newToken = randomBytes(32).toString('base64url');
      changes.previewTokenHash = hashToken(newToken);
      changes.firstOpenedAt = now;
      if (lead.status === 'preview-sent') changes.status = 'opened';
    } else if (
      !leadTokenMatches(presentedToken, lead) &&
      (lead.secondTokenHash === undefined || lead.secondTokenHash === null)
    ) {
      newToken = randomBytes(32).toString('base64url');
      changes.secondTokenHash = hashToken(newToken);
    }

    if (Object.keys(changes).length > 0) repo.update(leadId, changes);
    return { access: 'ok' as const, newToken };
  });
}

/**
 * Reads a preview for the browser presenting `token`. Read-only: the timer
 * starts and the binding happens in `openPreviewLink`, from the `/p/<id>`
 * link, so a preview whose timer has not started is `unopened`.
 */
export async function getPreview(
  leadId: string,
  token: string | undefined,
  now: Date = new Date(),
): Promise<PreviewAccess> {
  if (!isLeadId(leadId)) return { state: 'not-found' };

  const lead = await leads.get(leadId);
  if (lead === null) return { state: 'not-found' };
  if (previewClosed(lead, now)) return { state: 'expired' };
  if (lead.status !== 'paid' && (!timerStarted(lead) || lead.previewTokenHash === null)) {
    return { state: 'unopened' };
  }
  return { state: 'ok', lead, canPublish: leadTokenMatches(token, lead) };
}

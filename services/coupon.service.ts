import 'server-only';

import { z } from 'zod';

import { PRICE_FROM_RUPEES } from '@/lib/business';
import {
  type AppliedCoupon,
  COUPON_CODE_PATTERN,
  couponFieldsSchema,
  discountedPrice,
  MAX_PERCENT_OFF,
  normalizeCouponCode,
} from '@/lib/coupons';
import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { withTimeout } from '@/lib/utils';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository, MAX_PAGE_SIZE, type StoredDocument } from '@/services/repository';

/**
 * Coupons: a code that takes a percentage off the list price on the preview's
 * payment sheet. The admin makes them on `/admin` > Coupons. ADR-0015.
 *
 * One document per coupon, under an auto id, with the code as a field. A
 * code is looked up by an equality query, which the automatic single-field
 * index serves. Two coupons never share a code: `createCoupon` checks inside
 * its transaction.
 *
 * A coupon is never deleted. The admin turns it off, and the leads that used
 * it keep their record (`lead.coupon`), which is what the usage count reads.
 *
 * The home page's ribbon names one coupon. Its choice lives in
 * `siteContent/home-ribbon`.
 */

export const COUPON_COLLECTION = 'coupons';

/** The most coupons `/admin` lists. Far above what a small team makes. */
export const MAX_COUPONS = MAX_PAGE_SIZE;

export const couponSchema = z.object({
  code: z.string().regex(COUPON_CODE_PATTERN),
  percentOff: z.number().int().min(1).max(MAX_PERCENT_OFF),
  active: z.boolean(),
  /** Whose code it is, for a referral cashback. `''` for none. */
  note: z.string().max(120),
});

export type CouponPayload = z.infer<typeof couponSchema>;
export type CouponDocument = StoredDocument<CouponPayload>;

export const coupons = createRepository({ collection: COUPON_COLLECTION, schema: couponSchema });

function codeQuery(code: string) {
  return coupons.ref().where('code', '==', code).limit(1);
}

/** The coupon with this code, on or off, or `null`. */
export async function findCoupon(rawCode: string): Promise<CouponDocument | null> {
  const code = normalizeCouponCode(rawCode);
  if (!COUPON_CODE_PATTERN.test(code)) return null;
  const page = await coupons.list({
    limit: 1,
    where: [['code', '==', code]],
    includeDeleted: true,
    // No order: the equality alone runs on the automatic index.
    orderBy: [],
  });
  return page.items[0] ?? null;
}

/** Every coupon, newest first. */
export async function listCoupons(): Promise<CouponDocument[]> {
  const page = await coupons.list({ limit: MAX_COUPONS, includeDeleted: true });
  return [...page.items];
}

/** What the couple pays, and the coupon that made it so. */
export type PriceQuote =
  | { ok: true; listRupees: number; payableRupees: number; coupon: AppliedCoupon | null }
  | { ok: false; message: string };

/** What the couple reads when a code does not work. */
export const COUPON_NOT_VALID = 'This code does not work. Check it, or pay the full price.';

/**
 * The price for a code the couple typed, or the list price for none. The
 * server always prices the order from this, never from the page. An unknown
 * code and a code the admin turned off read the same to the couple.
 */
export async function quotePrice(rawCode: string | null): Promise<PriceQuote> {
  const listRupees = PRICE_FROM_RUPEES;
  if (rawCode === null || normalizeCouponCode(rawCode) === '') {
    return { ok: true, listRupees, payableRupees: listRupees, coupon: null };
  }
  const coupon = await findCoupon(rawCode);
  if (coupon === null || !coupon.active) return { ok: false, message: COUPON_NOT_VALID };
  return {
    ok: true,
    listRupees,
    payableRupees: discountedPrice(listRupees, coupon.percentOff),
    coupon: { code: coupon.code, percentOff: coupon.percentOff },
  };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the fields and try again.';
}

/** Makes a coupon, on. Refuses a code that exists already, on or off. */
export async function createCoupon(raw: unknown, adminUid: string): Promise<AdminResult> {
  const parsed = couponFieldsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  const fields = parsed.data;

  return coupons.runTransaction(async (repo, tx) => {
    const existing = await tx.get(codeQuery(fields.code));
    if (!existing.empty) {
      return {
        ok: false,
        message: `${fields.code} exists already. Turn it on below, or choose another code.`,
      } as AdminResult;
    }
    const id = repo.create({ ...fields, active: true });
    recordAdminActionIn(tx, {
      action: 'coupon-created',
      targetType: 'coupon',
      targetId: id,
      detail: `Made coupon ${fields.code}: ${fields.percentOff}% off.`,
      adminUid,
    });
    return {
      ok: true,
      message: `${fields.code} works now: ${fields.percentOff}% off.`,
    } as AdminResult;
  });
}

/** A Firestore auto id. Checked before a read, so junk never reaches Firestore. */
function isDocumentId(id: string): boolean {
  return /^[A-Za-z0-9]{20}$/.test(id);
}

const NOT_FOUND: AdminResult = { ok: false, message: 'That coupon does not exist.' };

/** Turns a coupon on or off. Leads that used it keep their record. */
export async function setCouponActive(
  id: string,
  active: boolean,
  adminUid: string,
): Promise<AdminResult> {
  if (!isDocumentId(id)) return NOT_FOUND;
  return coupons.runTransaction(async (repo, tx) => {
    const coupon = await repo.get(id);
    if (coupon === null) return NOT_FOUND;
    if (coupon.active === active) {
      return { ok: true, message: `${coupon.code} is ${active ? 'on' : 'off'} already.` };
    }
    repo.update(id, { active });
    recordAdminActionIn(tx, {
      action: active ? 'coupon-turned-on' : 'coupon-turned-off',
      targetType: 'coupon',
      targetId: id,
      detail: `Turned coupon ${coupon.code} ${active ? 'on' : 'off'}.`,
      adminUid,
    });
    return {
      ok: true,
      message: active
        ? `${coupon.code} works again.`
        : `${coupon.code} no longer works. The home page ribbon hides it.`,
    };
  });
}

// ---------------------------------------------------------------------------
// The home page ribbon
// ---------------------------------------------------------------------------

const RIBBON_DOC_ID = 'home-ribbon';

const ribbonSchema = z.object({
  /** The coupon the ribbon names, or `null` to hide the ribbon. */
  couponCode: z.string().regex(COUPON_CODE_PATTERN).nullable(),
});

const homeRibbon = createRepository({ collection: SITE_CONTENT_COLLECTION, schema: ribbonSchema });

/** The id is fixed and short on purpose: one document, read by key. */
const RIBBON_ID_OPTIONS = { minLength: RIBBON_DOC_ID.length };

/** How long one instance keeps the ribbon before it reads it again. */
const RIBBON_CACHE_MS = 60 * 1000;

/** The home page waits this long for the ribbon, then shows the page without it. */
const RIBBON_READ_TIMEOUT_MS = 1500;

let cachedRibbon: { at: number; ribbon: AppliedCoupon | null } | null = null;

/** Forgets the cached ribbon on this instance. For tests, and after a change. */
export function resetRibbonCache(): void {
  cachedRibbon = null;
}

/** The code the admin chose for the ribbon, on or off, or `null`. For `/admin`. */
export async function getRibbonCode(): Promise<string | null> {
  const document = await homeRibbon.get(RIBBON_DOC_ID);
  return document?.couponCode ?? null;
}

async function readRibbon(): Promise<AppliedCoupon | null> {
  const code = await getRibbonCode();
  if (code === null) return null;
  const coupon = await findCoupon(code);
  if (coupon === null || !coupon.active) return null;
  return { code: coupon.code, percentOff: coupon.percentOff };
}

/**
 * The coupon the home page ribbon shows, or `null` for no ribbon: none
 * chosen, or the chosen coupon is off. Cached for a minute. A failed read
 * shows no ribbon and is logged; the page never fails for it.
 */
export async function getHomeRibbon(): Promise<AppliedCoupon | null> {
  if (cachedRibbon !== null && Date.now() - cachedRibbon.at < RIBBON_CACHE_MS) {
    return cachedRibbon.ribbon;
  }
  try {
    const ribbon = await withTimeout(
      readRibbon(),
      RIBBON_READ_TIMEOUT_MS,
      'Reading the home page ribbon',
    );
    cachedRibbon = { at: Date.now(), ribbon };
    return ribbon;
  } catch (error) {
    logger.warn('The home page ribbon could not be read', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Shows the ribbon with the coupon `rawCode`, or hides it for `null`. */
export async function saveRibbon(rawCode: string | null, adminUid: string): Promise<AdminResult> {
  let couponCode: string | null = null;
  if (rawCode !== null && normalizeCouponCode(rawCode) !== '') {
    const coupon = await findCoupon(rawCode);
    if (coupon === null) return { ok: false, message: 'Choose a coupon from the list.' };
    if (!coupon.active) return { ok: false, message: `Turn ${coupon.code} on first.` };
    couponCode = coupon.code;
  }

  await homeRibbon.runTransaction(async (repo, tx) => {
    if ((await repo.get(RIBBON_DOC_ID)) === null) {
      repo.createWithId(RIBBON_DOC_ID, { couponCode }, RIBBON_ID_OPTIONS);
    } else {
      repo.update(RIBBON_DOC_ID, { couponCode });
    }
    recordAdminActionIn(tx, {
      action: 'ribbon-changed',
      // The ribbon is set on the Coupons tab, so the activity log links there.
      targetType: 'coupon',
      targetId: RIBBON_DOC_ID,
      detail:
        couponCode === null
          ? 'Hid the home page ribbon.'
          : `Set the home page ribbon to coupon ${couponCode}.`,
      adminUid,
    });
  });
  resetRibbonCache();
  return {
    ok: true,
    message:
      couponCode === null
        ? 'The ribbon is hidden.'
        : `Saved. The home page shows ${couponCode} within a minute.`,
  };
}

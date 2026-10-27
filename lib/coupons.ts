import { z } from 'zod';

/**
 * Coupon codes: a percentage off the list price, typed on the preview's
 * payment sheet. The admin makes them on `/admin` > Coupons, and may show one
 * in the ribbon at the top of the home page. ADR-0015.
 *
 * Pure: the rules for a code and the price arithmetic, shared by the admin
 * form, the payment and the tests. The stored coupons live in
 * `services/coupon.service.ts`.
 */

/** Capital letters and digits, 3 to 20 of them: `NEW20`, `RIYA100`. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

/** The largest discount a code may give. The provider refuses a ₹0 order. */
export const MAX_PERCENT_OFF = 90;

/**
 * A code as the couple or the admin typed it, made comparable: no spaces,
 * capital letters. `new 20` and `New20` both become `NEW20`.
 */
export function normalizeCouponCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export const couponCodeSchema = z
  .string()
  .transform(normalizeCouponCode)
  .pipe(
    z
      .string()
      .regex(
        COUPON_CODE_PATTERN,
        'Use 3 to 20 capital letters and digits, with no spaces or symbols.',
      ),
  );

/** What the admin types to make a coupon. */
export const couponFieldsSchema = z.object({
  code: couponCodeSchema,
  percentOff: z.coerce
    .number({ message: 'Type the discount as a number.' })
    .int('Use a whole number, such as 20.')
    .min(1, 'The discount is at least 1%.')
    .max(MAX_PERCENT_OFF, `The discount is at most ${MAX_PERCENT_OFF}%.`),
  /**
   * Whose code it is, for a referral cashback: `Riya & Aman's referral`.
   * Shown only on `/admin`. Never a phone number.
   */
  note: z.string().trim().max(120, 'Keep the note under 120 characters.'),
});

export type CouponFields = z.infer<typeof couponFieldsSchema>;

/** A coupon as a lead and a payment record it: the code and what it took off. */
export const appliedCouponSchema = z.object({
  code: z.string().regex(COUPON_CODE_PATTERN),
  percentOff: z.number().int().min(1).max(MAX_PERCENT_OFF),
});

export type AppliedCoupon = z.infer<typeof appliedCouponSchema>;

/**
 * The price after `percentOff`, in whole rupees. The percentage comes off the
 * list price rounded up to the next ₹10, so ₹799 counts as ₹800: 20% off is
 * ₹640 and 30% off is ₹560, not ₹639 and ₹559. The product owner asked for
 * round prices (2026-10-27). Never below ₹1: a provider refuses an order for
 * nothing. With no coupon the couple still pays the list price itself.
 */
export function discountedPrice(listRupees: number, percentOff: number): number {
  const base = Math.ceil(listRupees / 10) * 10;
  return Math.max(1, Math.round((base * (100 - percentOff)) / 100));
}

/** `₹799`, as every price on the site is printed. */
export function formatRupees(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/** The fields of a lead that the usage count reads. */
interface CouponUser {
  status: string;
  coupon?: { code: string } | undefined;
}

/**
 * The paid leads that used each code, keyed by code, in the order given.
 * `/admin` > Coupons lists them for a referral cashback. A lead counts once
 * it is paid, whether a payment or the admin's "Make live" did it.
 */
export function usesByCode<T extends CouponUser>(leads: readonly T[]): Map<string, T[]> {
  const uses = new Map<string, T[]>();
  for (const lead of leads) {
    if (lead.status !== 'paid' || lead.coupon === undefined) continue;
    const list = uses.get(lead.coupon.code);
    if (list === undefined) uses.set(lead.coupon.code, [lead]);
    else list.push(lead);
  }
  return uses;
}

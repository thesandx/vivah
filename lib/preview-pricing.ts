/**
 * The preview's price, as the admin sets it on `/admin` > Coupons, without a
 * deploy. It lives in `siteContent/preview-pricing`
 * (`services/preview-pricing.service.ts`). Pure, so it is tested without
 * Firestore.
 *
 * - `priceRupees` is what the couple pays before any coupon. The server
 *   charges it (`quotePrice`), and a coupon comes off it.
 * - `struckRupees` is the struck-through price the pay button shows beside
 *   it, with the percentage off. Equal to `priceRupees` shows no struck price.
 * - `checkoutBar` turns on the fixed "Buy at ₹799" bar in place of the
 *   drag-up sheet on the preview page (the product owner, 2026-11-22).
 */

import { z } from 'zod';

import { PRICE_FROM_RUPEES, STRUCK_PRICE_RUPEES } from '@/lib/business';

/** The fixed id of the one `siteContent` document. */
export const PREVIEW_PRICING_DOC_ID = 'preview-pricing';

/** The highest price the admin may type. A guard against a typo with one zero too many. */
export const MAX_PRICE_RUPEES = 50_000;

/** What the site uses before the first save, and when the read fails on a page. */
export const DEFAULT_PREVIEW_PRICING: PreviewPricing = {
  priceRupees: PRICE_FROM_RUPEES,
  struckRupees: STRUCK_PRICE_RUPEES,
  checkoutBar: false,
};

const rupees = (what: string) =>
  z.coerce
    .number({ message: `Type the ${what} as a number.` })
    .int(`Use whole rupees for the ${what}, such as 799.`)
    .min(1, `The ${what} is at least ₹1.`)
    .max(MAX_PRICE_RUPEES, `The ${what} is at most ₹${MAX_PRICE_RUPEES.toLocaleString('en-IN')}.`);

/** What the admin types: the two prices. */
export const previewPricesSchema = z
  .object({ priceRupees: rupees('price'), struckRupees: rupees('cut price') })
  .refine((prices) => prices.struckRupees >= prices.priceRupees, {
    message: 'The cut price must be the same as the price or higher.',
    path: ['struckRupees'],
  });

export type PreviewPrices = z.infer<typeof previewPricesSchema>;

/** The stored document. */
export const previewPricingSchema = z.object({
  priceRupees: z.number().int().min(1).max(MAX_PRICE_RUPEES),
  struckRupees: z.number().int().min(1).max(MAX_PRICE_RUPEES),
  checkoutBar: z.boolean(),
});

export type PreviewPricing = z.infer<typeof previewPricingSchema>;

/**
 * The percentage `paidRupees` is below `struckRupees`, rounded to the
 * nearest 10: 60, 70, 80 (the product owner, 2026-11-22). ₹799 against
 * ₹1,999 is 60.03%, so 60. 0 when it is not below, or less than 5% below.
 */
export function roundedPercentOff(struckRupees: number, paidRupees: number): number {
  if (struckRupees <= 0 || paidRupees >= struckRupees) return 0;
  const exact = ((struckRupees - paidRupees) / struckRupees) * 100;
  return Math.min(90, Math.round(exact / 10) * 10);
}

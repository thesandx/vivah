// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { PRICE_FROM_RUPEES } from '@/lib/business';
import { discountedPrice } from '@/lib/coupons';
import { makePreviewLive } from '@/services/admin.service';
import {
  createCoupon,
  findCoupon,
  getHomeRibbon,
  quotePrice,
  resetRibbonCache,
  saveRibbon,
  setCouponActive,
} from '@/services/coupon.service';
import { createLead, leads } from '@/services/lead.service';

/**
 * Coupons against the real Firestore emulator: the unique code is a check
 * inside a transaction, and the price the payment charges comes from the
 * stored coupon, so a mock would prove nothing. ADR-0015.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const ADMIN = 'AdminUid1234567890abcdefghi';

/** A code no earlier run made. */
function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    .toUpperCase()
    .slice(0, 20);
}

describeEmulator('coupons (emulator)', () => {
  it('makes a code once, prices with it, and stops pricing once it is off', async () => {
    const code = uniqueCode('T');
    expect(
      (await createCoupon({ code: code.toLowerCase(), percentOff: '20', note: '' }, ADMIN)).ok,
    ).toBe(true);
    expect((await createCoupon({ code, percentOff: '30', note: '' }, ADMIN)).ok).toBe(false);

    expect(await quotePrice(code)).toEqual({
      ok: true,
      listRupees: PRICE_FROM_RUPEES,
      payableRupees: discountedPrice(PRICE_FROM_RUPEES, 20),
      coupon: { code, percentOff: 20 },
    });
    expect(await quotePrice(null)).toMatchObject({
      ok: true,
      payableRupees: PRICE_FROM_RUPEES,
      coupon: null,
    });
    expect((await quotePrice('NOSUCHCODE1')).ok).toBe(false);

    const coupon = await findCoupon(code);
    expect(coupon).not.toBeNull();
    await setCouponActive(coupon?.id ?? '', false, ADMIN);
    expect((await quotePrice(code)).ok).toBe(false);
  });

  it('shows the ribbon only while its coupon works', async () => {
    const code = uniqueCode('R');
    await createCoupon({ code, percentOff: '15', note: '' }, ADMIN);
    expect((await saveRibbon(code, ADMIN)).ok).toBe(true);
    expect(await getHomeRibbon()).toEqual({ code, percentOff: 15 });

    const coupon = await findCoupon(code);
    await setCouponActive(coupon?.id ?? '', false, ADMIN);
    resetRibbonCache();
    expect(await getHomeRibbon()).toBeNull();

    expect((await saveRibbon(null, ADMIN)).ok).toBe(true);
  });

  it('records the coupon an admin names on "Make live"', async () => {
    const code = uniqueCode('M');
    await createCoupon({ code, percentOff: '10', note: 'Referral from Riya' }, ADMIN);
    const leadId = await createLead({
      bride: 'Riya',
      groom: 'Aman',
      weddingDate: null,
      phoneE164: '+919876543210',
      slug: null,
      isBot: false,
    });
    const slug = `live-${Date.now().toString(36)}`;
    expect((await makePreviewLive(leadId, slug, ADMIN, 'NOSUCHCODE1')).ok).toBe(false);
    expect((await makePreviewLive(leadId, slug, ADMIN, code.toLowerCase())).ok).toBe(true);
    expect(await leads.getOrThrow(leadId)).toMatchObject({
      status: 'paid',
      weddingSlug: slug,
      coupon: { code, percentOff: 10 },
    });
  });
});

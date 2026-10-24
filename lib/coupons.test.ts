import { describe, expect, it } from 'vitest';

import {
  couponCodeSchema,
  couponFieldsSchema,
  discountedPrice,
  formatRupees,
  normalizeCouponCode,
  usesByCode,
} from '@/lib/coupons';

describe('normalizeCouponCode', () => {
  it('drops spaces and capitalises', () => {
    expect(normalizeCouponCode(' new 20 ')).toBe('NEW20');
    expect(normalizeCouponCode('Riya100')).toBe('RIYA100');
  });
});

describe('couponCodeSchema', () => {
  it('takes capital letters and digits', () => {
    expect(couponCodeSchema.parse('new20')).toBe('NEW20');
  });

  it.each(['AB', 'NEW-20', 'NEW_20', 'A'.repeat(21), '', 'नया20'])('refuses %j', (raw) => {
    expect(couponCodeSchema.safeParse(raw).success).toBe(false);
  });
});

describe('couponFieldsSchema', () => {
  it('reads the admin form', () => {
    expect(couponFieldsSchema.parse({ code: 'new20', percentOff: '20', note: ' Launch ' })).toEqual(
      { code: 'NEW20', percentOff: 20, note: 'Launch' },
    );
  });

  it.each(['0', '91', '12.5', 'twenty'])('refuses a discount of %j', (percentOff) => {
    expect(couponFieldsSchema.safeParse({ code: 'NEW20', percentOff, note: '' }).success).toBe(
      false,
    );
  });
});

describe('discountedPrice', () => {
  it('takes the percentage off and rounds to the rupee', () => {
    expect(discountedPrice(799, 20)).toBe(639);
    expect(discountedPrice(799, 40)).toBe(479);
    expect(discountedPrice(799, 10)).toBe(719);
  });

  it('never goes below one rupee', () => {
    expect(discountedPrice(1, 90)).toBe(1);
  });
});

describe('formatRupees', () => {
  it('prints Indian grouping', () => {
    expect(formatRupees(799)).toBe('₹799');
    expect(formatRupees(5000)).toBe('₹5,000');
  });
});

describe('usesByCode', () => {
  it('groups the paid leads by the code they used', () => {
    const leads = [
      { id: 'a', status: 'paid', coupon: { code: 'NEW20' } },
      { id: 'b', status: 'opened', coupon: { code: 'NEW20' } },
      { id: 'c', status: 'paid' },
      { id: 'd', status: 'paid', coupon: { code: 'RIYA10' } },
      { id: 'e', status: 'paid', coupon: { code: 'NEW20' } },
    ];
    const uses = usesByCode(leads);
    expect(uses.get('NEW20')?.map((lead) => lead.id)).toEqual(['a', 'e']);
    expect(uses.get('RIYA10')?.map((lead) => lead.id)).toEqual(['d']);
    expect(uses.has('NONE')).toBe(false);
  });
});

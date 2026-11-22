import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREVIEW_PRICING,
  previewPricesSchema,
  roundedPercentOff,
} from '@/lib/preview-pricing';

describe('roundedPercentOff', () => {
  it('rounds the saving to the nearest 10', () => {
    expect(roundedPercentOff(1999, 799)).toBe(60);
    expect(roundedPercentOff(1999, 599)).toBe(70);
    expect(roundedPercentOff(1999, 399)).toBe(80);
    expect(roundedPercentOff(1999, 640)).toBe(70); // 67.98%
    expect(roundedPercentOff(1999, 1100)).toBe(40); // 44.97%
  });

  it('is 0 at or above the cut price, or for a saving under 5%', () => {
    expect(roundedPercentOff(1999, 1999)).toBe(0);
    expect(roundedPercentOff(1999, 2500)).toBe(0);
    expect(roundedPercentOff(1999, 1950)).toBe(0);
  });

  it('never says more than 90%', () => {
    expect(roundedPercentOff(1999, 1)).toBe(90);
  });
});

describe('previewPricesSchema', () => {
  it('takes whole rupees typed as text', () => {
    expect(previewPricesSchema.parse({ priceRupees: '699', struckRupees: '1999' })).toEqual({
      priceRupees: 699,
      struckRupees: 1999,
    });
  });

  it('refuses a cut price below the price', () => {
    const result = previewPricesSchema.safeParse({ priceRupees: '999', struckRupees: '799' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'The cut price must be the same as the price or higher.',
    );
  });

  it('refuses zero, fractions and a typo with too many zeros', () => {
    expect(previewPricesSchema.safeParse({ priceRupees: '0', struckRupees: '1999' }).success).toBe(
      false,
    );
    expect(
      previewPricesSchema.safeParse({ priceRupees: '799.5', struckRupees: '1999' }).success,
    ).toBe(false);
    expect(
      previewPricesSchema.safeParse({ priceRupees: '799', struckRupees: '199900' }).success,
    ).toBe(false);
  });

  it('defaults to today’s prices with the drag-up sheet', () => {
    expect(DEFAULT_PREVIEW_PRICING).toEqual({
      priceRupees: 799,
      struckRupees: 1999,
      checkoutBar: false,
    });
  });
});

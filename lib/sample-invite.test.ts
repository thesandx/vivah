import { describe, expect, it } from 'vitest';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import {
  isOldSampleSlug,
  isSampleSlug,
  SAMPLE_SLUG,
  sampleWedding,
  sampleWeddingDate,
} from '@/lib/sample-invite';
import { weddingFunctionsSchema } from '@/lib/wedding-functions';

describe('sampleWeddingDate', () => {
  it('is 7 December this year while it is a month or more away', () => {
    expect(sampleWeddingDate(new Date('2026-10-18T10:00:00Z'))).toBe('2026-12-07');
    expect(sampleWeddingDate(new Date('2026-11-07T00:00:00Z'))).toBe('2026-12-07');
  });

  it('moves to next year inside the last month, and after the day', () => {
    expect(sampleWeddingDate(new Date('2026-11-08T00:00:00Z'))).toBe('2027-12-07');
    expect(sampleWeddingDate(new Date('2026-12-25T00:00:00Z'))).toBe('2027-12-07');
  });
});

describe('sampleWedding', () => {
  it('is Priya and Rahul at a Delhi venue', () => {
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'));
    expect(wedding).toMatchObject({
      bride: 'Priya',
      groom: 'Rahul',
      venueCity: 'New Delhi, Delhi',
    });
  });

  it('has every function, dated round the wedding day', () => {
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'));
    expect(weddingFunctionsSchema.safeParse(wedding.functions).success).toBe(true);
    expect(wedding.functions.map((entry) => [entry.kind, entry.date])).toEqual([
      ['tilak', '2026-12-05'],
      ['haldi', '2026-12-06'],
      ['mehndi', '2026-12-06'],
      ['sangeet', '2026-12-06'],
      ['reception', '2026-12-08'],
    ]);
  });
});

describe('the sample address', () => {
  it('is a valid host label, so the router serves it', () => {
    expect(isValidCoupleSlug(SAMPLE_SLUG)).toBe(true);
    expect(isSampleSlug('priya-rahul')).toBe(true);
    expect(isSampleSlug('priya-rahul-2')).toBe(false);
    expect(isSampleSlug('riya-arjun')).toBe(false);
    expect(isOldSampleSlug('riya-arjun')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import { isSampleSlug, SAMPLE_SLUG, sampleWedding, sampleWeddingDate } from '@/lib/sample-invite';

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
  it('is Riya and Arjun at a Delhi venue', () => {
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'));
    expect(wedding).toMatchObject({ bride: 'Riya', groom: 'Arjun', venueCity: 'New Delhi, Delhi' });
  });
});

describe('the sample address', () => {
  it('is a valid host label, so the router serves it', () => {
    expect(isValidCoupleSlug(SAMPLE_SLUG)).toBe(true);
    expect(isSampleSlug('riya-arjun')).toBe(true);
    expect(isSampleSlug('riya-arjun-2')).toBe(false);
  });
});

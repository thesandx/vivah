import { describe, expect, it } from 'vitest';

import { formatWeddingDate } from '@/lib/wedding-date';

describe('formatWeddingDate', () => {
  it('writes the day in full, without shifting it by a time zone', () => {
    expect(formatWeddingDate('2026-03-09')).toBe('Monday, 9 March 2026');
  });

  it('returns the input when it is not a date', () => {
    expect(formatWeddingDate('soon')).toBe('soon');
  });
});

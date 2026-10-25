import { describe, expect, it } from 'vitest';

import { coupleNames, orderedNames, parseNameOrder } from '@/lib/couple-names';

const couple = { bride: 'Priya', groom: 'Rahul' };

describe('couple names', () => {
  it('puts the bride first by default, as every older invite does', () => {
    expect(orderedNames(couple)).toEqual(['Priya', 'Rahul']);
    expect(coupleNames(couple)).toBe('Priya & Rahul');
    expect(coupleNames({ ...couple, nameOrder: 'bride-first' })).toBe('Priya & Rahul');
  });

  it('puts the groom first when the couple chose it', () => {
    const groomFirst = { ...couple, nameOrder: 'groom-first' as const };
    expect(orderedNames(groomFirst)).toEqual(['Rahul', 'Priya']);
    expect(coupleNames(groomFirst)).toBe('Rahul & Priya');
    expect(coupleNames(groomFirst, 'and')).toBe('Rahul and Priya');
  });

  it('reads only the two known orders', () => {
    expect(parseNameOrder('groom-first')).toBe('groom-first');
    expect(parseNameOrder('bride-first')).toBe('bride-first');
    expect(parseNameOrder('groom')).toBeNull();
    expect(parseNameOrder(undefined)).toBeNull();
  });
});

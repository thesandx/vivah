import { describe, expect, it } from 'vitest';

import { isDetailsHash, tidyDetailsUrl } from '@/lib/details-link';

describe('isDetailsHash', () => {
  it('accepts #details, also with text after it', () => {
    expect(isDetailsHash('#details')).toBe(true);
    expect(isDetailsHash('#details?utm_source=facebook')).toBe(true);
    expect(isDetailsHash('#details&fbclid=abc')).toBe(true);
    expect(isDetailsHash('#details/')).toBe(true);
  });

  it('refuses other hashes', () => {
    expect(isDetailsHash('')).toBe(false);
    expect(isDetailsHash('#start')).toBe(false);
    expect(isDetailsHash('#detailsx')).toBe(false);
  });
});

describe('tidyDetailsUrl', () => {
  it('moves parameters from the hash into the query string', () => {
    expect(tidyDetailsUrl('/', '', '#details?utm_source=facebook&utm_campaign=A14')).toBe(
      '/?utm_source=facebook&utm_campaign=A14#details',
    );
  });

  it('keeps the query string, and its values win', () => {
    expect(tidyDetailsUrl('/', '?utm_source=instagram', '#details&utm_source=x&fbclid=abc')).toBe(
      '/?utm_source=instagram&fbclid=abc#details',
    );
  });

  it('has nothing to do for a plain #details or another hash', () => {
    expect(tidyDetailsUrl('/', '?a=1', '#details')).toBeNull();
    expect(tidyDetailsUrl('/', '', '#start')).toBeNull();
  });

  it('drops a bare trailing slash', () => {
    expect(tidyDetailsUrl('/', '', '#details/')).toBe('/#details');
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildCoupleSlug,
  isValidCoupleSlug,
  MAX_SLUG_LENGTH,
  slugifyName,
  slugProblem,
  suggestedSlugs,
  withSuffix,
} from '@/lib/couple-slug';

describe('slugifyName', () => {
  it('lowercases and joins words with a hyphen', () => {
    expect(slugifyName('Raadha Rani')).toBe('raadha-rani');
  });

  it('removes accents and symbols', () => {
    expect(slugifyName('  Józef!! ')).toBe('jozef');
  });

  it('returns an empty string for a name with no Latin letters', () => {
    expect(slugifyName('राधा')).toBe('');
  });

  it('cuts a long name without leaving a trailing hyphen', () => {
    const slug = slugifyName('Raadha Rani Kumari Sharma Verma');
    expect(slug.length).toBeLessThanOrEqual(18);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('buildCoupleSlug', () => {
  it('joins the two names', () => {
    expect(buildCoupleSlug('Raadha', 'Shyam')).toBe('raadha-shyam');
  });

  it('uses the other name when one has no Latin form', () => {
    expect(buildCoupleSlug('राधा', 'Shyam')).toBe('shyam');
  });

  it('returns null when neither name has a Latin form', () => {
    expect(buildCoupleSlug('राधा', 'श्याम')).toBeNull();
  });

  it('never returns a reserved label', () => {
    expect(buildCoupleSlug('www', '')).toBeNull();
  });
});

describe('isValidCoupleSlug', () => {
  it.each(['raadha-shyam', 'sita-ram', 'ab', 'a1-b2'])('accepts %s', (slug) => {
    expect(isValidCoupleSlug(slug)).toBe(true);
  });

  it.each([
    '',
    'a',
    '-raadha',
    'raadha-',
    'raadha--shyam',
    'Raadha',
    'raadha.shyam',
    'raadha_shyam',
    'www',
    'api',
    '_',
    'a'.repeat(MAX_SLUG_LENGTH + 1),
  ])('refuses %j', (slug) => {
    expect(isValidCoupleSlug(slug)).toBe(false);
  });
});

describe('withSuffix', () => {
  it('keeps the bare slug for the first attempt and numbers the rest', () => {
    expect(withSuffix('raadha-shyam', 1)).toBe('raadha-shyam');
    expect(withSuffix('raadha-shyam', 2)).toBe('raadha-shyam-2');
  });
});

describe('suggestedSlugs', () => {
  it('offers bride first, then groom first', () => {
    expect(suggestedSlugs('Radha', 'Shyam')).toEqual(['radha-shyam', 'shyam-radha']);
  });

  it('drops a duplicate when both orders give the same slug', () => {
    expect(suggestedSlugs('राधा', 'Shyam')).toEqual(['shyam']);
  });

  it('returns nothing when neither name has an ASCII form', () => {
    expect(suggestedSlugs('राधा', 'श्याम')).toEqual([]);
  });
});

describe('slugProblem', () => {
  it('accepts a valid slug', () => {
    expect(slugProblem('radha-shyam')).toBeNull();
  });

  it.each([
    ['a', 'at least 2'],
    ['a'.repeat(41), '40 characters or fewer'],
    ['Radha', 'lowercase'],
    ['-radha', 'lowercase'],
    ['radha--shyam', 'lowercase'],
    ['radha.shyam', 'lowercase'],
    ['www', 'kept for Vivah'],
  ])('refuses %s', (slug, message) => {
    expect(slugProblem(slug)).toContain(message);
  });
});

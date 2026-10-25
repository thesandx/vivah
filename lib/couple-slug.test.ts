import { describe, expect, it } from 'vitest';

import {
  buildCoupleSlug,
  isValidCoupleSlug,
  MAX_SLUG_LENGTH,
  nameOrderFromSlug,
  slugCandidates,
  slugifyFirstName,
  slugifyName,
  slugProblem,
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

describe('slugifyFirstName', () => {
  it('keeps the first word only', () => {
    expect(slugifyFirstName('  Sandeep Kumar Jha ')).toBe('sandeep');
  });

  it('skips a leading word with no ASCII form', () => {
    expect(slugifyFirstName('राधा Rani')).toBe('rani');
  });

  it('returns an empty string when no word has an ASCII form', () => {
    expect(slugifyFirstName('राधा')).toBe('');
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

describe('slugCandidates', () => {
  it('lists both name orders first, then word forms, then numbers', () => {
    expect(slugCandidates('Radha', 'Shyam')).toEqual([
      'radha-shyam',
      'shyam-radha',
      'radha-weds-shyam',
      'shyam-weds-radha',
      'radha-and-shyam',
      'shyam-and-radha',
      'radha-shyam-2',
      'radha-shyam-3',
      'radha-shyam-4',
      'radha-shyam-5',
      'radha-shyam-6',
      'radha-shyam-7',
      'radha-shyam-8',
      'radha-shyam-9',
    ]);
  });

  it('uses only the first name of a full name', () => {
    expect(slugCandidates('Anushka Kumari', 'Sandeep Kumar Jha').slice(0, 7)).toEqual([
      'anushka-sandeep',
      'sandeep-anushka',
      'anushka-weds-sandeep',
      'sandeep-weds-anushka',
      'anushka-and-sandeep',
      'sandeep-and-anushka',
      'anushka-sandeep-2',
    ]);
  });

  it('uses the one name that has an ASCII form', () => {
    expect(slugCandidates('राधा', 'Shyam').slice(0, 2)).toEqual(['shyam', 'shyam-2']);
  });

  it('returns nothing when neither name has an ASCII form', () => {
    expect(slugCandidates('राधा', 'श्याम')).toEqual([]);
  });

  it('never suggests the sample invite address', () => {
    expect(slugCandidates('Priya', 'Rahul')).not.toContain('priya-rahul');
    expect(slugCandidates('Priya', 'Rahul')[0]).toBe('rahul-priya');
  });

  it('returns only valid slugs', () => {
    expect(slugCandidates('A'.repeat(18), 'B'.repeat(18)).every(isValidCoupleSlug)).toBe(true);
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
    ['priya-rahul', 'kept for Vivah'],
    ['riya-arjun', 'kept for Vivah'],
  ])('refuses %s', (slug, message) => {
    expect(slugProblem(slug)).toContain(message);
  });
});

describe('nameOrderFromSlug', () => {
  it('reads whose first name the address starts with', () => {
    expect(nameOrderFromSlug('rahul-priya', 'Priya Sharma', 'Rahul Verma')).toBe('groom-first');
    expect(nameOrderFromSlug('rahul-weds-priya', 'Priya', 'Rahul')).toBe('groom-first');
    expect(nameOrderFromSlug('priya-rahul-2', 'Priya', 'Rahul')).toBe('bride-first');
    expect(nameOrderFromSlug('rahul', 'Priya', 'Rahul')).toBe('groom-first');
  });

  it('answers null when the address starts with neither name, or with both', () => {
    expect(nameOrderFromSlug('virushka', 'Anushka', 'Virat')).toBeNull();
    expect(nameOrderFromSlug('rahulpriya', 'Priya', 'Rahul')).toBeNull();
    expect(nameOrderFromSlug('aman-aman', 'Aman', 'Aman')).toBeNull();
  });
});

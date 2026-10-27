import { describe, expect, it } from 'vitest';

import {
  EMPTY_FAMILY,
  familyHasNames,
  familyTitle,
  familyTitleSuggestions,
  orderedSides,
  parseWeddingFamilies,
  weddingFamiliesSchema,
} from '@/lib/wedding-families';

describe('familyTitle', () => {
  it('prints the couple’s own heading exactly as written', () => {
    expect(familyTitle({ ...EMPTY_FAMILY, title: 'The Gupta Family' })).toBe('The Gupta Family');
    expect(
      familyTitle({ ...EMPTY_FAMILY, title: 'Gupta Parivar', father: 'Shri Rajesh Sharma' }),
    ).toBe('Gupta Parivar');
  });

  it('falls back to the first name of the bride or groom', () => {
    expect(familyTitle(EMPTY_FAMILY, 'Priya Sharma')).toBe('Priya’s Family');
    expect(familyTitle({ ...EMPTY_FAMILY, father: 'Rajesh' }, 'Rahul')).toBe('Rahul’s Family');
  });

  it('shows no title when the couple chose No title', () => {
    expect(
      familyTitle({ ...EMPTY_FAMILY, noTitle: true, father: 'Shri Rajesh Gupta' }, 'Priya'),
    ).toBeNull();
  });

  it('reads a family name saved by the first release, adding Parivar', () => {
    expect(familyTitle({ ...EMPTY_FAMILY, surname: 'Gupta' })).toBe('Gupta Parivar');
  });

  it('takes the last word of the father’s name, then the grandfather’s', () => {
    expect(familyTitle({ ...EMPTY_FAMILY, father: 'Shri Rajesh Gupta' })).toBe('Gupta Parivar');
    expect(familyTitle({ ...EMPTY_FAMILY, grandfather: 'Shri Jagdev Prasad Bhagat' })).toBe(
      'Bhagat Parivar',
    );
  });

  it('gives nothing for a single word or no names', () => {
    expect(familyTitle({ ...EMPTY_FAMILY, father: 'Rajesh' })).toBeNull();
    expect(familyTitle(EMPTY_FAMILY)).toBeNull();
  });
});

describe('familyTitleSuggestions', () => {
  it('offers the surname, the first name and the traditional words, once each', () => {
    expect(
      familyTitleSuggestions(
        'bride',
        { ...EMPTY_FAMILY, father: 'Shri Rajiv Malhotra' },
        'Priya Malhotra',
      ),
    ).toEqual([
      'Malhotra Parivar',
      'The Malhotra Family',
      'Priya’s Family',
      'Vadhu Paksh',
      'The Bride’s Family',
    ]);
    expect(familyTitleSuggestions('groom', EMPTY_FAMILY, 'Rahul')).toEqual([
      'Rahul’s Family',
      'Var Paksh',
      'The Groom’s Family',
    ]);
  });
});

describe('familyHasNames', () => {
  it('needs a grandparent or a parent, not only a family name', () => {
    expect(familyHasNames(undefined)).toBe(false);
    expect(familyHasNames({ ...EMPTY_FAMILY, title: 'Gupta Parivar' })).toBe(false);
    expect(familyHasNames({ ...EMPTY_FAMILY, mother: 'Smt. Dezi Gupta' })).toBe(true);
  });
});

describe('orderedSides', () => {
  it('follows the couple’s name order, bride first by default', () => {
    expect(orderedSides(undefined)).toEqual(['bride', 'groom']);
    expect(orderedSides('groom-first')).toEqual(['groom', 'bride']);
  });
});

describe('parseWeddingFamilies', () => {
  it('reads both sides, trims, and turns an empty field into null', () => {
    const result = parseWeddingFamilies({
      'groom.title': '  The Gupta   Family ',
      'groom.mother': '  Smt.   Dezi Gupta ',
      'groom.father': 'Shri Rajesh Gupta',
      'bride.grandmother': '',
    });
    expect(result).toEqual({
      ok: true,
      families: {
        groom: {
          ...EMPTY_FAMILY,
          title: 'The Gupta Family',
          mother: 'Smt. Dezi Gupta',
          father: 'Shri Rajesh Gupta',
        },
        bride: EMPTY_FAMILY,
      },
    });
    if (result.ok) expect(weddingFamiliesSchema.parse(result.families)).toEqual(result.families);
  });

  it('keeps No title and drops the typed title with it', () => {
    const result = parseWeddingFamilies({
      'bride.noTitle': '1',
      'bride.title': 'Malhotra Parivar',
    });
    expect(result.ok && result.families.bride).toEqual({ ...EMPTY_FAMILY, noTitle: true });
  });

  it('marks a name that is too long, by its field', () => {
    const result = parseWeddingFamilies({ 'bride.father': 'x'.repeat(61) });
    expect(result).toEqual({
      ok: false,
      errors: { 'bride.father': 'Keep this under 60 characters.' },
    });
  });
});

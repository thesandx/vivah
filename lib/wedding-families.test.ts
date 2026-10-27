import { describe, expect, it } from 'vitest';

import {
  EMPTY_FAMILY,
  familyHasNames,
  familyTitle,
  orderedSides,
  parseWeddingFamilies,
  weddingFamiliesSchema,
} from '@/lib/wedding-families';

describe('familyTitle', () => {
  it('prints the family name with Parivar', () => {
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

describe('familyHasNames', () => {
  it('needs a grandparent or a parent, not only a family name', () => {
    expect(familyHasNames(undefined)).toBe(false);
    expect(familyHasNames({ ...EMPTY_FAMILY, surname: 'Gupta' })).toBe(false);
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
      'groom.surname': 'Gupta Parivar',
      'groom.mother': '  Smt.   Dezi Gupta ',
      'groom.father': 'Shri Rajesh Gupta',
      'bride.grandmother': '',
    });
    expect(result).toEqual({
      ok: true,
      families: {
        groom: {
          ...EMPTY_FAMILY,
          surname: 'Gupta',
          mother: 'Smt. Dezi Gupta',
          father: 'Shri Rajesh Gupta',
        },
        bride: EMPTY_FAMILY,
      },
    });
    if (result.ok) expect(weddingFamiliesSchema.parse(result.families)).toEqual(result.families);
  });

  it('marks a name that is too long, by its field', () => {
    const result = parseWeddingFamilies({ 'bride.father': 'x'.repeat(61) });
    expect(result).toEqual({
      ok: false,
      errors: { 'bride.father': 'Keep this under 60 characters.' },
    });
  });
});

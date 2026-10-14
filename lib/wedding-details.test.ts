import { describe, expect, it } from 'vitest';

import { canEditWedding, isAdminPhone, parseWeddingDetails } from '@/lib/wedding-details';

const FORM = {
  bride: ' Anushka ',
  groom: 'Sandeep',
  weddingDate: '2026-03-09',
  ceremonyTime: '19:00',
  venueName: 'Laxmisagar',
  venueCity: 'Darbhanga, Bihar',
  venueMapsUrl: 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86',
};

describe('parseWeddingDetails', () => {
  it('reads a filled form', () => {
    expect(parseWeddingDetails(FORM)).toEqual({
      ok: true,
      details: { ...FORM, bride: 'Anushka' },
    });
  });

  it('turns an empty optional field into null, which clears it', () => {
    const result = parseWeddingDetails({
      ...FORM,
      weddingDate: '',
      ceremonyTime: '',
      venueName: ' ',
      venueMapsUrl: '',
    });
    expect(result.ok && result.details).toMatchObject({
      weddingDate: null,
      ceremonyTime: null,
      venueName: null,
      venueMapsUrl: null,
    });
  });

  it('names each field that is wrong', () => {
    const result = parseWeddingDetails({
      ...FORM,
      bride: '',
      ceremonyTime: '7pm',
      venueMapsUrl: 'https://evil.example',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['bride', 'ceremonyTime', 'venueMapsUrl']);
    }
  });
});

describe('who may edit', () => {
  const admins = ['+919546342507'];

  it('lets the couple and an admin edit, nobody else', () => {
    expect(canEditWedding('+917983873235', '+917983873235', admins)).toBe(true);
    expect(canEditWedding('+919546342507', '+917983873235', admins)).toBe(true);
    expect(canEditWedding('+919999999999', '+917983873235', admins)).toBe(false);
    expect(canEditWedding(null, '+917983873235', admins)).toBe(false);
  });

  it('knows an admin only by a verified number on the list', () => {
    expect(isAdminPhone('+919546342507', admins)).toBe(true);
    expect(isAdminPhone(null, admins)).toBe(false);
    expect(isAdminPhone('+919546342507', [])).toBe(false);
  });
});

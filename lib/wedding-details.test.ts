import { describe, expect, it } from 'vitest';

import { canEditWedding, parseWeddingDetails } from '@/lib/wedding-details';

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
  it('lets only the couple edit from the couple dashboard', () => {
    expect(canEditWedding('+917983873235', '+917983873235')).toBe(true);
    expect(canEditWedding('+919546342507', '+917983873235')).toBe(false);
    expect(canEditWedding(null, '+917983873235')).toBe(false);
  });
});

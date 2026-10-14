// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { weddingSchema } from '@/services/wedding.service';

const BASE = {
  slug: 'anushka-sandeep',
  bride: 'Anushka',
  groom: 'Sandeep',
  weddingDate: '2026-03-09',
  ownerPhoneE164: '+917983873235',
  leadId: 'lead-1',
};

describe('weddingSchema', () => {
  it('reads a wedding published before the ceremony details existed', () => {
    expect(weddingSchema.safeParse(BASE).success).toBe(true);
  });

  it('accepts the ceremony details the invite shows', () => {
    const parsed = weddingSchema.safeParse({
      ...BASE,
      ceremonyTime: '19:00',
      venueName: 'Laxmisagar',
      venueCity: 'Darbhanga, Bihar',
      venueMapsUrl: 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86',
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses a malformed time and a link that is not Google Maps', () => {
    expect(weddingSchema.safeParse({ ...BASE, ceremonyTime: '7pm' }).success).toBe(false);
    expect(weddingSchema.safeParse({ ...BASE, ceremonyTime: '24:00' }).success).toBe(false);
    expect(
      weddingSchema.safeParse({ ...BASE, venueMapsUrl: 'https://evil.example/maps' }).success,
    ).toBe(false);
  });
});

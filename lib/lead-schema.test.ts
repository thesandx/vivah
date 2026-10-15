import { describe, expect, it } from 'vitest';

import { leadRequestSchema, todayInIndia } from '@/lib/lead-schema';

function nextYear(): string {
  const today = todayInIndia();
  return `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
}

const VALID = {
  bride: ' Raadha ',
  groom: 'Shyam',
  weddingDate: null,
  countryIso: 'IN',
  phone: '98765 43210',
  consent: true,
};

describe('leadRequestSchema', () => {
  it('trims the names and turns the phone into E.164', () => {
    expect(leadRequestSchema.parse(VALID)).toEqual({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: null,
      phoneE164: '+919876543210',
      slug: null,
      songSlot: null,
      isBot: false,
    });
  });

  it('keeps a chosen song slot, and refuses one that does not exist', () => {
    expect(leadRequestSchema.parse({ ...VALID, songSlot: 2 }).songSlot).toBe(2);
    expect(leadRequestSchema.safeParse({ ...VALID, songSlot: 5 }).success).toBe(false);
    expect(leadRequestSchema.safeParse({ ...VALID, songSlot: '2' }).success).toBe(false);
  });

  it('keeps a chosen address, and refuses one that cannot be an address', () => {
    expect(leadRequestSchema.parse({ ...VALID, slug: 'virushka' }).slug).toBe('virushka');
    const dotted = leadRequestSchema.safeParse({ ...VALID, slug: 'radha.shyam' });
    expect(dotted.success).toBe(false);
    expect(dotted.error?.issues[0]?.path).toEqual(['slug']);
    expect(leadRequestSchema.safeParse({ ...VALID, slug: 'admin' }).success).toBe(false);
  });

  it('accepts a future wedding date', () => {
    const date = nextYear();
    expect(leadRequestSchema.parse({ ...VALID, weddingDate: date }).weddingDate).toBe(date);
  });

  it('refuses a past date, a date far ahead, and a malformed date', () => {
    for (const weddingDate of ['2001-01-01', '2999-01-01', '09/03/2026']) {
      expect(leadRequestSchema.safeParse({ ...VALID, weddingDate }).success).toBe(false);
    }
  });

  it('refuses a missing consent tick', () => {
    expect(leadRequestSchema.safeParse({ ...VALID, consent: false }).success).toBe(false);
  });

  it('reports a wrong phone number on the phone field', () => {
    const result = leadRequestSchema.safeParse({ ...VALID, phone: '12345' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['phone']);
  });

  it('refuses unknown keys, so a caller cannot set a stored field', () => {
    expect(leadRequestSchema.safeParse({ ...VALID, status: 'paid' }).success).toBe(false);
  });

  it('marks a request that filled the honeypot', () => {
    expect(leadRequestSchema.parse({ ...VALID, website: 'https://spam.test' }).isBot).toBe(true);
  });

  it('defaults the country to India', () => {
    const { countryIso: _unused, ...withoutCountry } = VALID;
    expect(leadRequestSchema.parse(withoutCountry).phoneE164).toBe('+919876543210');
  });

  it('refuses a number from outside India', () => {
    expect(leadRequestSchema.safeParse({ ...VALID, countryIso: 'US' }).success).toBe(false);
  });
});

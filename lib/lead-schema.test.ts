import { describe, expect, it } from 'vitest';

import { leadRequestSchema, todayInIndia } from '@/lib/lead-schema';

function nextYear(): string {
  return `${Number(todayInIndia().slice(0, 4)) + 1}-06-15`;
}

const DATE = nextYear();

const VALID = {
  bride: ' Raadha ',
  groom: 'Shyam',
  weddingDate: DATE,
  countryIso: 'IN',
  phone: '98765 43210',
  consent: true,
};

describe('leadRequestSchema', () => {
  it('trims the names and turns the phone into E.164', () => {
    expect(leadRequestSchema.parse(VALID)).toEqual({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: DATE,
      phoneE164: '+919876543210',
      slug: null,
      songSlot: null,
      isBot: false,
    });
  });

  it('saves each name with a capital first letter, however it was typed', () => {
    const parsed = leadRequestSchema.parse({ ...VALID, bride: 'rIYA', groom: 'ARJUN singh' });
    expect([parsed.bride, parsed.groom]).toEqual(['Riya', 'Arjun Singh']);
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

  it('requires the wedding date, so every preview has a countdown', () => {
    for (const weddingDate of [null, undefined, '']) {
      const result = leadRequestSchema.safeParse({ ...VALID, weddingDate });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['weddingDate']);
    }
    expect(
      leadRequestSchema.safeParse({ ...VALID, weddingDate: null }).error?.issues[0]?.message,
    ).toBe('Choose your wedding date.');
  });

  it('refuses a past date, a date far ahead, and a malformed date', () => {
    for (const weddingDate of ['2001-01-01', '2999-01-01', '09/03/2026']) {
      expect(leadRequestSchema.safeParse({ ...VALID, weddingDate }).success).toBe(false);
    }
  });

  it('needs no consent tick, and still accepts one from a cached page', () => {
    const { consent: _, ...withoutTick } = VALID;
    expect(leadRequestSchema.safeParse(withoutTick).success).toBe(true);
    expect(leadRequestSchema.safeParse({ ...VALID, consent: true }).success).toBe(true);
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

  it('keeps a Google click id, and refuses text that is not one', () => {
    expect(leadRequestSchema.parse({ ...VALID, gclid: 'Cj0KCQjw_abc-123XYZ' }).gclid).toBe(
      'Cj0KCQjw_abc-123XYZ',
    );
    expect(leadRequestSchema.parse(VALID)).not.toHaveProperty('gclid');
    expect(leadRequestSchema.safeParse({ ...VALID, gclid: '<b>x</b>' }).success).toBe(false);
  });

  it('defaults the country to India', () => {
    const { countryIso: _unused, ...withoutCountry } = VALID;
    expect(leadRequestSchema.parse(withoutCountry).phoneE164).toBe('+919876543210');
  });

  it('refuses a number from outside India', () => {
    expect(leadRequestSchema.safeParse({ ...VALID, countryIso: 'US' }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DIAL_COUNTRY,
  findDialCountry,
  formatPhoneForDisplay,
  indianMobileDigits,
  phoneHintDigits,
  toE164,
} from './phone';

describe('toE164', () => {
  it('prefixes the dial code to a national number', () => {
    expect(toE164('IN', '98765 43210')).toEqual({ ok: true, e164: '+919876543210' });
  });

  it('ignores spaces, dashes and brackets', () => {
    expect(toE164('US', '(415) 555-0132')).toEqual({ ok: true, e164: '+14155550132' });
  });

  it('drops a trunk zero', () => {
    expect(toE164('IN', '09876543210')).toEqual({ ok: true, e164: '+919876543210' });
    expect(toE164('GB', '07700 900123')).toEqual({ ok: true, e164: '+447700900123' });
  });

  it('accepts the dial code typed again with a plus', () => {
    expect(toE164('IN', '+91 98765 43210')).toEqual({ ok: true, e164: '+919876543210' });
  });

  it('says how many digits the country needs', () => {
    expect(toE164('IN', '98765')).toEqual({
      ok: false,
      message: 'Numbers in India have 10 digits. You entered 5.',
    });
  });

  it('asks for a number when nothing was typed', () => {
    expect(toE164('IN', ' - ')).toEqual({ ok: false, message: 'Enter your phone number.' });
  });

  it('falls back to the default country for an unknown code', () => {
    expect(findDialCountry('ZZ').iso).toBe(DEFAULT_DIAL_COUNTRY);
  });
});

describe('formatPhoneForDisplay', () => {
  it('groups the national number after the dial code', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
  });

  it('prefers the longest matching dial code', () => {
    expect(formatPhoneForDisplay('+971501234567')).toBe('+971 50123 4567');
  });

  it('returns an unknown number unchanged', () => {
    expect(formatPhoneForDisplay('+8613800138000')).toBe('+8613800138000');
  });
});

describe('indianMobileDigits', () => {
  it('keeps digits only, at most 10', () => {
    expect(indianMobileDigits('98765 43210')).toBe('9876543210');
    expect(indianMobileDigits('9876543210123')).toBe('9876543210');
  });

  it('drops the 0 an autofilled number often starts with', () => {
    expect(indianMobileDigits('09876543210')).toBe('9876543210');
  });

  it('drops a +91 typed or autofilled in front', () => {
    expect(indianMobileDigits('+91 98765 43210')).toBe('9876543210');
  });

  it('leaves a short number as typed', () => {
    expect(indianMobileDigits('0987')).toBe('0987');
  });
});

describe('phoneHintDigits', () => {
  it('keeps only the last two digits', () => {
    expect(phoneHintDigits('+917983873235')).toBe('35');
  });

  it('refuses a number too short to hint', () => {
    expect(phoneHintDigits('+')).toBeNull();
  });
});

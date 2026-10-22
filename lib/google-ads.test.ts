import { describe, expect, it } from 'vitest';

import { conversionTarget, gtagScriptUrl, parseGclid } from '@/lib/google-ads';

describe('parseGclid', () => {
  it('keeps a click id', () => {
    expect(parseGclid('Cj0KCQjw_abc-123XYZ')).toBe('Cj0KCQjw_abc-123XYZ');
  });

  it('trims spaces', () => {
    expect(parseGclid('  Cj0KCQjw_abc-123XYZ ')).toBe('Cj0KCQjw_abc-123XYZ');
  });

  it('refuses text that is not a click id', () => {
    expect(parseGclid(null)).toBeNull();
    expect(parseGclid('short')).toBeNull();
    expect(parseGclid('<script>alert(1)</script>')).toBeNull();
    expect(parseGclid('a'.repeat(201))).toBeNull();
  });
});

describe('conversionTarget', () => {
  it('joins the id and the label', () => {
    expect(conversionTarget('AW-123456789', 'AbC-D_efG')).toBe('AW-123456789/AbC-D_efG');
  });

  it('is null when either is missing', () => {
    expect(conversionTarget('', 'AbC')).toBeNull();
    expect(conversionTarget('AW-123456789', '')).toBeNull();
  });
});

describe('gtagScriptUrl', () => {
  it('names the account', () => {
    expect(gtagScriptUrl('AW-123456789')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=AW-123456789',
    );
  });
});

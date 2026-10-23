import { describe, expect, it } from 'vitest';

import {
  campaignFrom,
  classifySource,
  deviceFor,
  HOME_CTAS,
  HOME_SECTIONS,
  isSignupCta,
  MAX_SECTION_MS,
  visitBeaconSchema,
} from '@/lib/visit-tracking';

const HOST = 'vivah.online';

const BEACON = {
  visitId: '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b',
  seq: 0,
  device: 'phone',
  source: 'instagram',
  sectionMs: { hero: 4200, try: 9000 },
  clicks: ['try-cta'],
  steps: ['started', 'details'],
};

describe('classifySource', () => {
  it('names a Google ad by its click id, before anything else', () => {
    expect(classifySource('?gclid=abc&utm_source=instagram', '', HOST)).toBe('google-ads');
    expect(classifySource('?gbraid=abc', '', HOST)).toBe('google-ads');
  });

  it('trusts utm_source over the referrer, since Instagram often sends none', () => {
    expect(classifySource('?utm_source=ig', '', HOST)).toBe('instagram');
    expect(classifySource('?utm_source=facebook', 'https://www.google.com/', HOST)).toBe(
      'facebook',
    );
    expect(classifySource('?utm_source=WhatsApp', '', HOST)).toBe('whatsapp');
    expect(classifySource('?utm_source=newsletter', '', HOST)).toBe('other-site');
  });

  it('reads the referrer host', () => {
    expect(classifySource('', 'https://www.google.co.in/', HOST)).toBe('google');
    expect(classifySource('', 'https://l.instagram.com/', HOST)).toBe('instagram');
    expect(classifySource('', 'https://m.facebook.com/', HOST)).toBe('facebook');
    expect(classifySource('', 'https://example.com/post', HOST)).toBe('other-site');
  });

  it('counts no referrer, a bad one, or our own site as direct', () => {
    expect(classifySource('', '', HOST)).toBe('direct');
    expect(classifySource('', 'not a url', HOST)).toBe('direct');
    expect(classifySource('', 'https://vivah.online/help', HOST)).toBe('direct');
    expect(classifySource('', 'https://riya-arjun.vivah.online/', `www.${HOST}`)).toBe('direct');
  });
});

describe('campaignFrom', () => {
  it('takes utm_campaign, else utm_content', () => {
    expect(campaignFrom('?utm_campaign=search-core')).toBe('search-core');
    expect(campaignFrom('?utm_content=A01')).toBe('A01');
    expect(campaignFrom('')).toBeUndefined();
  });

  it('drops anything that is not plain text', () => {
    expect(campaignFrom('?utm_campaign=%3Cscript%3E')).toBeUndefined();
    expect(campaignFrom('?utm_campaign=')).toBeUndefined();
  });
});

describe('deviceFor', () => {
  it('splits at the md and lg breakpoints', () => {
    expect(deviceFor(390)).toBe('phone');
    expect(deviceFor(768)).toBe('tablet');
    expect(deviceFor(1024)).toBe('desktop');
  });
});

describe('the id lists', () => {
  it('has no repeated id', () => {
    const sections = HOME_SECTIONS.map((section) => section.id);
    const ctas = HOME_CTAS.map((cta) => cta.id);
    expect(new Set(sections).size).toBe(sections.length);
    expect(new Set(ctas).size).toBe(ctas.length);
  });

  it('knows which buttons open the sign-up card', () => {
    expect(isSignupCta('sticky-bar')).toBe(true);
    expect(isSignupCta('final-whatsapp')).toBe(false);
  });
});

describe('visitBeaconSchema', () => {
  it('accepts a beacon of fixed ids and numbers', () => {
    expect(visitBeaconSchema.parse(BEACON)).toEqual(BEACON);
    const withLead = { ...BEACON, lead: { id: 'AbCdEfGhIjKlMnOpQrSt', cta: 'try-cta' } };
    expect(visitBeaconSchema.parse(withLead)).toEqual(withLead);
  });

  it('refuses an unknown key, section or button, so no free text is stored', () => {
    expect(visitBeaconSchema.safeParse({ ...BEACON, name: 'Riya' }).success).toBe(false);
    expect(visitBeaconSchema.safeParse({ ...BEACON, sectionMs: { footer: 1 } }).success).toBe(
      false,
    );
    expect(visitBeaconSchema.safeParse({ ...BEACON, clicks: ['buy-now'] }).success).toBe(false);
    expect(visitBeaconSchema.safeParse({ ...BEACON, visitId: 'riya' }).success).toBe(false);
  });

  it('refuses a section time above the cap', () => {
    const long = { ...BEACON, sectionMs: { hero: MAX_SECTION_MS + 1 } };
    expect(visitBeaconSchema.safeParse(long).success).toBe(false);
  });
});

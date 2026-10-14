import { describe, expect, it } from 'vitest';

import { inviteUrl, normaliseHost, resolveSiteSurface } from '@/lib/site-host';

const ROOT = 'vivah.online';

describe('normaliseHost', () => {
  it('lowercases and removes a port and a trailing dot', () => {
    expect(normaliseHost(' Vivah.Online.:443 ')).toBe('vivah.online');
  });
});

describe('resolveSiteSurface', () => {
  it('shows the product site on the root domain', () => {
    expect(resolveSiteSurface('vivah.online', ROOT)).toEqual({ kind: 'main' });
  });

  it('shows a couple invite on a subdomain', () => {
    expect(resolveSiteSurface('raadha-shyam.vivah.online', ROOT)).toEqual({
      kind: 'invite',
      slug: 'raadha-shyam',
    });
  });

  it('ignores the case and the port of the host', () => {
    expect(resolveSiteSurface('Sita-Ram.Vivah.Online:443', ROOT)).toEqual({
      kind: 'invite',
      slug: 'sita-ram',
    });
  });

  it('treats www as the product site', () => {
    expect(resolveSiteSurface('www.vivah.online', ROOT)).toEqual({ kind: 'main' });
  });

  it('gives a deeper or invalid label the invite surface with no slug', () => {
    expect(resolveSiteSurface('a.b.vivah.online', ROOT)).toEqual({ kind: 'invite', slug: '' });
    expect(resolveSiteSurface('api.vivah.online', ROOT)).toEqual({ kind: 'invite', slug: '' });
  });

  it('shows the product site on any other host', () => {
    expect(resolveSiteSurface('vivah-123.asia-south1.run.app', ROOT)).toEqual({ kind: 'main' });
    expect(resolveSiteSurface('localhost:3000', ROOT)).toEqual({ kind: 'main' });
    // A look-alike domain is not a subdomain.
    expect(resolveSiteSurface('evilvivah.online', ROOT)).toEqual({ kind: 'main' });
  });

  it('turns routing off when no root domain is set', () => {
    expect(resolveSiteSurface('raadha-shyam.vivah.online', '')).toEqual({ kind: 'main' });
  });
});

describe('inviteUrl', () => {
  it('builds the https link for a slug', () => {
    expect(inviteUrl('raadha-shyam', ROOT)).toBe('https://raadha-shyam.vivah.online');
  });
});

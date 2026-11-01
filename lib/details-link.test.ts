import { describe, expect, it } from 'vitest';

import {
  detailsPageUrl,
  detailsRedirectScript,
  isDetailsHash,
  LANDING_REFERRER_KEY,
} from '@/lib/details-link';

describe('isDetailsHash', () => {
  it('accepts #details, also with text after it', () => {
    expect(isDetailsHash('#details')).toBe(true);
    expect(isDetailsHash('#details?utm_source=facebook')).toBe(true);
    expect(isDetailsHash('#details&fbclid=abc')).toBe(true);
    expect(isDetailsHash('#details/')).toBe(true);
  });

  it('refuses other hashes', () => {
    expect(isDetailsHash('')).toBe(false);
    expect(isDetailsHash('#start')).toBe(false);
    expect(isDetailsHash('#detailsx')).toBe(false);
  });
});

describe('detailsPageUrl', () => {
  it('moves tags from the hash into the query string of /details', () => {
    expect(detailsPageUrl('', '#details?utm_source=facebook&utm_campaign=A14')).toBe(
      '/details?utm_source=facebook&utm_campaign=A14',
    );
  });

  it('keeps a value already in the query string', () => {
    expect(detailsPageUrl('?utm_source=instagram', '#details&utm_source=x&fbclid=abc')).toBe(
      '/details?utm_source=instagram&fbclid=abc',
    );
  });

  it('gives the plain page for a plain hash, and null for another hash', () => {
    expect(detailsPageUrl('', '#details')).toBe('/details');
    expect(detailsPageUrl('', '#details/')).toBe('/details');
    expect(detailsPageUrl('?a=1', '#details')).toBe('/details?a=1');
    expect(detailsPageUrl('', '#start')).toBeNull();
  });
});

describe('detailsRedirectScript', () => {
  /** Runs the inline script against a fake browser and returns where it went. */
  function run(href: string, rootDomain = 'vivah.online', referrer = '') {
    const url = new URL(href);
    const stored = new Map<string, string>();
    let movedTo: string | null = null;
    const fakeWindow = {
      location: {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        hostname: url.hostname,
        replace: (target: string) => {
          movedTo = target;
        },
      },
    };
    const fakeStorage = { setItem: (key: string, value: string) => stored.set(key, value) };
    new Function('window', 'document', 'sessionStorage', detailsRedirectScript(rootDomain))(
      fakeWindow,
      { referrer },
      fakeStorage,
    );
    return { movedTo, stored };
  }

  it('does what detailsPageUrl does on the home page', () => {
    for (const href of [
      'https://vivah.online/#details',
      'https://vivah.online/?utm_source=meta&utm_campaign=A01#details',
      'https://vivah.online/#details?utm_source=facebook&fbclid=abc',
      'https://vivah.online/?utm_source=instagram#details&utm_source=x&fbclid=abc',
      'https://www.vivah.online/#details/',
    ]) {
      const url = new URL(href);
      expect(run(href).movedTo, href).toBe(detailsPageUrl(url.search, url.hash));
    }
  });

  it('keeps the real referrer for the visit report', () => {
    const { stored } = run(
      'https://vivah.online/#details',
      'vivah.online',
      'https://l.instagram.com/',
    );
    expect(stored.get(LANDING_REFERRER_KEY)).toBe('https://l.instagram.com/');
  });

  it("stays put on another page, another hash, or a couple's invite", () => {
    expect(run('https://vivah.online/help#details').movedTo).toBeNull();
    expect(run('https://vivah.online/#start').movedTo).toBeNull();
    expect(run('https://priya-rahul.vivah.online/#details').movedTo).toBeNull();
  });

  it('works on any host when no root domain is set', () => {
    expect(run('http://localhost:3000/#details', '').movedTo).toBe('/details');
  });
});

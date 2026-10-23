// @vitest-environment node

import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { rootDomain: 'vivah.online' } }));

const { proxy } = await import('./proxy');

function request(path: string, forwardedHost?: string): NextRequest {
  const headers = new Headers({ host: 'vivah-123.asia-south1.run.app' });
  if (forwardedHost !== undefined) headers.set('x-forwarded-host', forwardedHost);
  return new NextRequest(`https://vivah-123.asia-south1.run.app${path}`, { headers });
}

const rewriteOf = (response: Response): string | null =>
  response.headers.get('x-middleware-rewrite');

describe('proxy', () => {
  it("rewrites a couple's host to their invite page", () => {
    const response = proxy(request('/', 'raadha-shyam.vivah.online'));
    expect(new URL(rewriteOf(response) ?? '').pathname).toBe('/site/raadha-shyam');
  });

  it('sends an invalid couple host to a 404 without a database read', () => {
    const response = proxy(request('/', 'www2--bad.vivah.online'));
    expect(new URL(rewriteOf(response) ?? '').pathname).toBe('/site/_');
  });

  it('leaves the product site alone', () => {
    const response = proxy(request('/', 'vivah.online'));
    expect(rewriteOf(response)).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects /site/<slug> on the product site to the real invite link', () => {
    const response = proxy(request('/site/raadha-shyam', 'vivah.online'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://raadha-shyam.vivah.online/');
  });

  it("sends WhatsApp's link-preview fetcher to the small share page", () => {
    const req = request('/Kartheek', 'raadha-shyam.vivah.online');
    req.headers.set('user-agent', 'WhatsApp/2.23.20.0 A');
    const response = proxy(req);
    expect(new URL(rewriteOf(response) ?? '').pathname).toBe('/api/share/raadha-shyam/Kartheek');
  });

  it("rewrites a guest's link to the guest page", () => {
    const response = proxy(request('/Kartheek-ji', 'raadha-shyam.vivah.online'));
    expect(new URL(rewriteOf(response) ?? '').pathname).toBe('/site/raadha-shyam/Kartheek-ji');
  });

  it('keeps the guest name when it redirects /site/<slug>/<guest>', () => {
    const response = proxy(request('/site/raadha-shyam/Kartheek', 'vivah.online'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://raadha-shyam.vivah.online/Kartheek');
  });

  it('falls back to the Host header when the Worker is bypassed', () => {
    const response = proxy(request('/'));
    expect(rewriteOf(response)).toBeNull();
  });

  it('lets only the product site frame the sample invite', () => {
    const sample = proxy(request('/Kartheek', 'riya-arjun.vivah.online'));
    expect(sample.headers.get('content-security-policy')).toBe(
      "frame-ancestors 'self' https://vivah.online",
    );
    const couple = proxy(request('/Kartheek', 'raadha-shyam.vivah.online'));
    expect(couple.headers.get('content-security-policy')).toBeNull();
  });

  it('names the same sample slug as the X-Frame-Options exemption in next.config.ts', async () => {
    const { SAMPLE_SLUG } = await import('@/lib/sample-invite');
    const { default: config } = await import('./next.config');
    const rules = (await config.headers?.()) ?? [];
    const deny = rules.find((rule) => rule.headers.some((h) => h.key === 'X-Frame-Options'));
    expect(deny?.source).toContain(`site/${SAMPLE_SLUG}(`);
    expect(deny?.missing?.[0]?.value).toBe(`${SAMPLE_SLUG}\\..*`);
  });
});

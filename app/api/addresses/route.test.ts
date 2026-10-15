// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkSlug = vi.fn<(slug: string) => Promise<unknown>>();
const freeSlugSuggestions = vi.fn<(bride: string, groom: string) => Promise<string[]>>();

vi.mock('@/services/wedding.service', () => ({
  checkSlug: (slug: string) => checkSlug(slug),
  freeSlugSuggestions: (bride: string, groom: string) => freeSlugSuggestions(bride, groom),
}));

const { GET } = await import('./route');

let visitor = 0;

/** Each request comes from a new visitor unless `ip` is given. */
function get(query: string, ip = `10.1.0.${(visitor += 1)}`): Request {
  return new Request(`http://localhost/api/addresses?${query}`, {
    headers: { 'CF-Connecting-IP': ip },
  });
}

describe('GET /api/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSlug.mockResolvedValue({ available: true });
    freeSlugSuggestions.mockResolvedValue(['radha-shyam', 'shyam-radha']);
  });

  it('offers free addresses for two names, with the domain', async () => {
    const response = await GET(get('bride=Radha&groom=Shyam'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: ['radha-shyam', 'shyam-radha'],
      domainLabel: expect.any(String) as unknown,
    });
    expect(freeSlugSuggestions).toHaveBeenCalledWith('Radha', 'Shyam');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('checks one typed address', async () => {
    checkSlug.mockResolvedValue({ available: false, reason: 'taken' });
    const response = await GET(get('slug=virushka'));
    expect(await response.json()).toEqual({ available: false, reason: 'taken' });
    expect(checkSlug).toHaveBeenCalledWith('virushka');
  });

  it('refuses an overlong address without reading the database', async () => {
    const response = await GET(get(`slug=${'a'.repeat(101)}`));
    expect(await response.json()).toMatchObject({ available: false, reason: 'invalid' });
    expect(checkSlug).not.toHaveBeenCalled();
  });

  it('answers 400 when a name is missing', async () => {
    expect((await GET(get('bride=Radha'))).status).toBe(400);
    expect(freeSlugSuggestions).not.toHaveBeenCalled();
  });

  it('answers 503 without detail when the database fails', async () => {
    checkSlug.mockRejectedValue(new Error('UNAVAILABLE: connection reset'));
    const response = await GET(get('slug=virushka'));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('connection reset');
  });

  it('refuses a visitor after 60 calls in a minute', async () => {
    for (let call = 0; call < 60; call += 1) {
      expect((await GET(get('slug=virushka', '203.0.113.20'))).status).toBe(200);
    }
    expect((await GET(get('slug=virushka', '203.0.113.20'))).status).toBe(429);
  });
});

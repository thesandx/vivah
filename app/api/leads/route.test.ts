// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { todayInIndia } from '@/lib/wedding-date';

const DATE = `${Number(todayInIndia().slice(0, 4)) + 1}-06-15`;

const createLead = vi.fn<(input: unknown) => Promise<string>>();

const checkSlug = vi.fn<(slug: string) => Promise<{ available: boolean }>>();

vi.mock('@/services/lead.service', () => ({
  createLead: (input: unknown) => createLead(input),
}));
const songInSlot = vi.fn<(slot: number) => Promise<unknown>>();
vi.mock('@/services/wedding-songs.service', () => ({
  songInSlot: (slot: number) => songInSlot(slot),
}));
vi.mock('@/services/wedding.service', () => ({
  checkSlug: (slug: string) => checkSlug(slug),
}));

const { POST } = await import('./route');

let visitor = 0;

/** Each request comes from a new visitor unless `ip` is given, so the rate limit stays out of the way. */
function post(body: unknown, ip = `10.0.0.${(visitor += 1)}`): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = {
  bride: 'Raadha',
  groom: 'Shyam',
  weddingDate: DATE,
  countryIso: 'IN',
  phone: '98765 43210',
  consent: true,
};

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLead.mockResolvedValue('AbCdEfGhIjKlMnOpQrSt');
    checkSlug.mockResolvedValue({ available: true });
  });

  it('creates a lead and answers with its preview path', async () => {
    const response = await POST(post(VALID));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' });
    expect(createLead).toHaveBeenCalledWith({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: DATE,
      phoneE164: '+919876543210',
      slug: null,
      songSlot: null,
      song: null,
      isBot: false,
    });
    expect(checkSlug).not.toHaveBeenCalled();
    expect(songInSlot).not.toHaveBeenCalled();
  });

  it('copies the chosen song from its slot, never from the body', async () => {
    songInSlot.mockResolvedValue({ name: 'Kesariya', file: 'song-2-abc.mp3' });
    const response = await POST(post({ ...VALID, songSlot: 2 }));
    expect(response.status).toBe(201);
    expect(songInSlot).toHaveBeenCalledWith(2);
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ song: { name: 'Kesariya', file: 'song-2-abc.mp3' } }),
    );
    expect((await POST(post({ ...VALID, song: { name: 'x', file: 'y' } }))).status).toBe(400);
  });

  it('stores the chosen address after checking it is still free', async () => {
    const response = await POST(post({ ...VALID, slug: 'virushka' }));
    expect(response.status).toBe(201);
    expect(checkSlug).toHaveBeenCalledWith('virushka');
    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({ slug: 'virushka' }));
  });

  it('answers 409 on the address field when the address was taken meanwhile', async () => {
    checkSlug.mockResolvedValue({ available: false });
    const response = await POST(post({ ...VALID, slug: 'virushka' }));
    expect(response.status).toBe(409);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(Object.keys(body.fields)).toEqual(['slug']);
    expect(createLead).not.toHaveBeenCalled();
  });

  it('answers 400 with one message per field', async () => {
    const response = await POST(post({ ...VALID, bride: '', phone: '123' }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(Object.keys(body.fields)).toEqual(expect.arrayContaining(['bride']));
    expect(createLead).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not JSON', async () => {
    const response = await POST(post('not json'));
    expect(response.status).toBe(400);
  });

  it('stores nothing for a bot, and answers like a success', async () => {
    const response = await POST(post({ ...VALID, website: 'https://spam.test' }));
    expect(response.status).toBe(201);
    expect(createLead).not.toHaveBeenCalled();
  });

  it('answers 500 without detail when the database fails', async () => {
    createLead.mockRejectedValue(new Error('UNAVAILABLE: connection reset'));
    const response = await POST(post(VALID));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('connection reset');
  });

  it('refuses a sixth preview from one visitor within 10 minutes', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await POST(post(VALID, '203.0.113.9'))).status).toBe(201);
    }
    const refused = await POST(post(VALID, '203.0.113.9'));
    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).not.toBeNull();
    expect((await POST(post(VALID, '203.0.113.10'))).status).toBe(201);
  });
});

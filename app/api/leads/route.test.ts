// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLead = vi.fn<(input: unknown) => Promise<string>>();

vi.mock('@/services/lead.service', () => ({
  createLead: (input: unknown) => createLead(input),
}));

const { POST } = await import('./route');

function post(body: unknown): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = {
  bride: 'Raadha',
  groom: 'Shyam',
  weddingDate: null,
  countryIso: 'IN',
  phone: '98765 43210',
  consent: true,
};

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLead.mockResolvedValue('AbCdEfGhIjKlMnOpQrSt');
  });

  it('creates a lead and answers with its preview path', async () => {
    const response = await POST(post(VALID));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ previewPath: '/p/AbCdEfGhIjKlMnOpQrSt' });
    expect(createLead).toHaveBeenCalledWith({
      bride: 'Raadha',
      groom: 'Shyam',
      weddingDate: null,
      phoneE164: '+919876543210',
      isBot: false,
    });
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
});

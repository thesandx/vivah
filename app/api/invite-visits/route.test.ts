// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordInviteBeacon = vi.fn<(beacon: unknown) => Promise<void>>();
vi.mock('@/services/invite-beacon.service', () => ({
  recordInviteBeacon: (beacon: unknown) => recordInviteBeacon(beacon),
}));

const { POST } = await import('./route');

const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1';

let visitor = 0;

function post(
  body: unknown,
  { ip, agent = BROWSER, cookie }: { ip?: string; agent?: string; cookie?: string } = {},
) {
  return new Request('http://localhost/api/invite-visits', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'CF-Connecting-IP': ip ?? `10.3.0.${(visitor += 1)}`,
      'User-Agent': agent,
      ...(cookie !== undefined && { Cookie: cookie }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const BEACON = {
  weddingId: 'AbCdEfGhIjKlMnOpQrSt',
  viewId: '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b',
  event: 'opened',
  device: 'phone',
  viewer: 'guest',
  firstVisit: true,
  guestLinkId: 'a'.repeat(64),
};

describe('POST /api/invite-visits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordInviteBeacon.mockResolvedValue(undefined);
  });

  it('stores a valid beacon and answers 204 with no body', async () => {
    const response = await POST(post(BEACON));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(recordInviteBeacon).toHaveBeenCalledWith(BEACON);
  });

  it('refuses a body that is not JSON, or not a beacon', async () => {
    expect((await POST(post('{nope'))).status).toBe(400);
    expect((await POST(post({ ...BEACON, phone: '9876543210' }))).status).toBe(400);
    expect((await POST(post({ ...BEACON, weddingId: '../weddings/x' }))).status).toBe(400);
    expect((await POST(post({ ...BEACON, event: 'typed something' }))).status).toBe(400);
    expect((await POST(post({ ...BEACON, guestLinkId: 'Neha' }))).status).toBe(400);
    expect(recordInviteBeacon).not.toHaveBeenCalled();
  });

  it('stores a beacon from the plain link, with no guest link', async () => {
    const { guestLinkId: _unused, ...plain } = BEACON;
    expect((await POST(post(plain))).status).toBe(204);
    expect(recordInviteBeacon).toHaveBeenCalledWith(plain);
  });

  it('refuses a body over 1 KB', async () => {
    expect((await POST(post('x'.repeat(2000)))).status).toBe(413);
  });

  it('answers a crawler without storing it', async () => {
    const response = await POST(post(BEACON, { agent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }));
    expect(response.status).toBe(204);
    expect(recordInviteBeacon).not.toHaveBeenCalled();
  });

  it('answers the admin without storing it', async () => {
    const response = await POST(post(BEACON, { cookie: 'other=1; vivah_admin=abc' }));
    expect(response.status).toBe(204);
    expect(recordInviteBeacon).not.toHaveBeenCalled();
  });

  it('answers 503 when the store fails', async () => {
    recordInviteBeacon.mockRejectedValue(new Error('down'));
    expect((await POST(post(BEACON))).status).toBe(503);
  });

  it('limits one visitor to 60 beacons in 10 minutes', async () => {
    const ip = '10.9.9.8';
    for (let i = 0; i < 60; i += 1) {
      expect((await POST(post(BEACON, { ip }))).status).toBe(204);
    }
    expect((await POST(post(BEACON, { ip }))).status).toBe(429);
  });
});

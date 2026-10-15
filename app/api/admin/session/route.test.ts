// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (cookie: { name: string; value: string }) => jar.set(cookie.name, cookie.value),
  }),
}));
vi.mock('@/lib/env', () => ({
  env: { adminEnabled: true, appUrl: 'https://vivah.online' },
}));

const startAdminSignIn = vi.fn();
const finishAdminSignIn = vi.fn();
const endAdminSession = vi.fn();
vi.mock('@/services/admin-session.service', () => ({
  startAdminSignIn: (...args: unknown[]) => startAdminSignIn(...args),
  finishAdminSignIn: (...args: unknown[]) => finishAdminSignIn(...args),
  endAdminSession: (...args: unknown[]) => endAdminSession(...args),
}));

const { DELETE, POST } = await import('./route');

const JWT = 'aaa.bbb.ccc';

function post(body: unknown, ip = '1.1.1.1'): Request {
  return new Request('https://vivah.online/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  });
}

describe('/api/admin/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jar.clear();
  });

  it('sets the pending cookie after the Google step and returns the phone', async () => {
    startAdminSignIn.mockResolvedValue({
      token: 'pending',
      maxAgeSeconds: 600,
      phoneE164: '+919546342507',
    });
    const response = await POST(post({ step: 'google', idToken: JWT }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ phoneE164: '+919546342507' });
    expect(jar.get('vivah_admin')).toBe('pending');
  });

  it('passes the pending cookie to the OTP step and swaps it', async () => {
    jar.set('vivah_admin', 'pending');
    finishAdminSignIn.mockResolvedValue({ token: 'active', maxAgeSeconds: 43_200 });
    const response = await POST(post({ step: 'otp', idToken: JWT }, '2.2.2.2'));
    expect(response.status).toBe(201);
    expect(finishAdminSignIn).toHaveBeenCalledWith('pending', JWT);
    expect(jar.get('vivah_admin')).toBe('active');
  });

  it('answers 401 when a step is refused, and 400 for a bad body', async () => {
    const error = new Error('This Google account cannot open the admin dashboard.');
    error.name = 'UnauthenticatedError';
    startAdminSignIn.mockRejectedValue(error);
    expect((await POST(post({ step: 'google', idToken: JWT }, '3.3.3.3'))).status).toBe(401);
    expect((await POST(post({ step: 'other', idToken: JWT }, '3.3.3.3'))).status).toBe(400);
    expect((await POST(post({ step: 'google', idToken: 'nope' }, '3.3.3.3'))).status).toBe(400);
  });

  it('limits one visitor to 10 tries in 10 minutes', async () => {
    startAdminSignIn.mockResolvedValue({ token: 't', maxAgeSeconds: 600, phoneE164: '+91' });
    for (let i = 0; i < 10; i += 1) await POST(post({ step: 'google', idToken: JWT }, '4.4.4.4'));
    expect((await POST(post({ step: 'google', idToken: JWT }, '4.4.4.4'))).status).toBe(429);
  });

  it('signs out by clearing the cookie and ending the session', async () => {
    jar.set('vivah_admin', 'active');
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(endAdminSession).toHaveBeenCalledWith('active');
    expect(jar.get('vivah_admin')).toBe('');
  });
});

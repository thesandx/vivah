// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The admin's two-step sign-in, with Firebase and Firestore replaced by
 * fakes. The rules under test are the server's: which token passes which
 * step, in which order, and for how long. See ADR-0008.
 */

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PHONE = '+919546342507';

vi.mock('@/lib/env', () => ({
  env: { adminEnabled: true, authEnabled: true, adminEmail: ADMIN_EMAIL, adminPhone: ADMIN_PHONE },
}));

interface FakeSession {
  uid: string;
  step: 'google' | 'active';
  expiresAt: Date;
  deletedAt: Date | null;
}

const rows = new Map<string, FakeSession>();
vi.mock('@/services/repository', () => ({
  createRepository: () => ({
    async get(id: string) {
      const row = rows.get(id);
      return row === undefined || row.deletedAt !== null ? null : { id, ...row };
    },
    async createWithId(id: string, payload: Omit<FakeSession, 'deletedAt'>) {
      if (rows.has(id)) throw new Error('exists');
      rows.set(id, { ...payload, deletedAt: null });
    },
    async update(id: string, patch: Partial<FakeSession>) {
      const row = rows.get(id);
      if (row === undefined) throw new Error('missing');
      Object.assign(row, patch);
    },
    async softDelete(id: string) {
      const row = rows.get(id);
      if (row !== undefined) row.deletedAt = new Date();
    },
  }),
}));

const recordAdminAction = vi.fn(async () => {});
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminAction: (...args: unknown[]) => recordAdminAction(...(args as [])),
}));

interface Claims {
  uid: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  auth_time: number;
  firebase: { sign_in_provider: string };
}
const tokens = new Map<string, Claims>();
vi.mock('@/services/firebase-admin.client', () => ({
  getFirebaseAuth: () => ({
    async verifyIdToken(token: string) {
      const claims = tokens.get(token);
      if (claims === undefined) throw new Error('bad token');
      return claims;
    },
  }),
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const {
  finishAdminSignIn,
  hasPendingAdminSignIn,
  startAdminSignIn,
  verifyAdminSession,
  endAdminSession,
} = await import('./admin-session.service');

const NOW = new Date('2026-10-15T10:00:00Z');
const nowSeconds = NOW.getTime() / 1000;

function google(overrides: Partial<Claims> = {}): string {
  const token = `google-${tokens.size}`;
  tokens.set(token, {
    uid: 'GoogleUid1234567890abcdefgh',
    email: ADMIN_EMAIL,
    email_verified: true,
    auth_time: nowSeconds,
    firebase: { sign_in_provider: 'google.com' },
    ...overrides,
  });
  return token;
}

function phone(overrides: Partial<Claims> = {}): string {
  const token = `phone-${tokens.size}`;
  tokens.set(token, {
    uid: 'PhoneUid1234567890abcdefghi',
    phone_number: ADMIN_PHONE,
    auth_time: nowSeconds,
    firebase: { sign_in_provider: 'phone' },
    ...overrides,
  });
  return token;
}

beforeEach(() => {
  rows.clear();
  tokens.clear();
  vi.clearAllMocks();
});

describe('the admin sign-in', () => {
  it('opens a session only after Google and then the OTP', async () => {
    const pending = await startAdminSignIn(google(), NOW);
    expect(pending.phoneE164).toBe(ADMIN_PHONE);
    expect(await hasPendingAdminSignIn(pending.token, NOW)).toBe(true);
    // The pending token alone is not an admin session.
    expect(await verifyAdminSession(pending.token, NOW)).toBeNull();

    const active = await finishAdminSignIn(pending.token, phone(), NOW);
    expect(active.token).not.toBe(pending.token);
    expect(await verifyAdminSession(active.token, NOW)).toMatchObject({
      uid: 'GoogleUid1234567890abcdefgh',
    });
    // The pending token is spent.
    expect(await hasPendingAdminSignIn(pending.token, NOW)).toBe(false);
    expect(recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'signed-in' }),
    );
  });

  it('refuses any other Google account, an unverified email, or a phone sign-in at step 1', async () => {
    await expect(startAdminSignIn(google({ email: 'someone@example.com' }), NOW)).rejects.toThrow(
      /cannot open/,
    );
    await expect(startAdminSignIn(google({ email_verified: false }), NOW)).rejects.toThrow();
    await expect(startAdminSignIn(phone(), NOW)).rejects.toThrow();
    await expect(startAdminSignIn('forged', NOW)).rejects.toThrow(/could not be verified/);
  });

  it('refuses the OTP step without the Google step in this browser', async () => {
    await expect(finishAdminSignIn(undefined, phone(), NOW)).rejects.toThrow(/Start again/);
    await expect(finishAdminSignIn('x'.repeat(43), phone(), NOW)).rejects.toThrow(/Start again/);
  });

  it('refuses another phone, a Google token, or an old OTP sign-in at step 2', async () => {
    for (const second of [
      phone({ phone_number: '+919876543210' }),
      google(),
      phone({ auth_time: nowSeconds - 11 * 60 }),
    ]) {
      const pending = await startAdminSignIn(google(), NOW);
      await expect(finishAdminSignIn(pending.token, second, NOW)).rejects.toThrow();
    }
  });

  it('lets the Google step expire after 10 minutes', async () => {
    const pending = await startAdminSignIn(google(), NOW);
    const later = new Date(NOW.getTime() + 11 * 60_000);
    await expect(
      finishAdminSignIn(pending.token, phone({ auth_time: later.getTime() / 1000 }), later),
    ).rejects.toThrow(/expired/);
  });

  it('keeps the session while the admin visits, and ends it after 90 idle days', async () => {
    const DAY = 24 * 3_600_000;
    const pending = await startAdminSignIn(google(), NOW);
    const { token, maxAgeSeconds } = await finishAdminSignIn(pending.token, phone(), NOW);
    // The cookie outlives the server session, so the server alone ends it.
    expect(maxAgeSeconds).toBeGreaterThan(90 * 24 * 3_600);

    // A visit every 60 days keeps the admin signed in for a year.
    for (let day = 60; day <= 360; day += 60) {
      expect(await verifyAdminSession(token, new Date(NOW.getTime() + day * DAY))).not.toBeNull();
    }
    // 91 days with no visit ends it.
    expect(await verifyAdminSession(token, new Date(NOW.getTime() + 451 * DAY))).toBeNull();
  });

  it('renews at most once a day', async () => {
    const pending = await startAdminSignIn(google(), NOW);
    const { token } = await finishAdminSignIn(pending.token, phone(), NOW);
    const row = [...rows.values()].find((r) => r.step === 'active' && r.deletedAt === null);
    const before = row?.expiresAt.getTime();
    await verifyAdminSession(token, new Date(NOW.getTime() + 3_600_000));
    expect(row?.expiresAt.getTime()).toBe(before);
    await verifyAdminSession(token, new Date(NOW.getTime() + 25 * 3_600_000));
    expect(row?.expiresAt.getTime()).toBeGreaterThan(before ?? Infinity);
  });

  it('ends the session at sign-out', async () => {
    const pending = await startAdminSignIn(google(), NOW);
    const { token } = await finishAdminSignIn(pending.token, phone(), NOW);

    await endAdminSession(token);
    expect(await verifyAdminSession(token, NOW)).toBeNull();
    expect(recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'signed-out' }),
    );
  });
});

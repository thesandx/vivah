import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';
import { z } from 'zod';

import {
  ADMIN_COOKIE_NAME,
  ADMIN_PENDING_SECONDS,
  ADMIN_SESSION_SECONDS,
} from '@/lib/admin-cookie';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { recordAdminAction } from '@/services/admin-audit.service';
import { UnauthenticatedError } from '@/services/auth.service';
import { getFirebaseAuth } from '@/services/firebase-admin.client';
import { createRepository } from '@/services/repository';

/**
 * The admin's two-step sign-in for `/admin`. See ADR-0008.
 *
 * 1. Google. The browser signs in with Google and posts the ID token. The
 *    server checks it is the `ADMIN_EMAIL` account and opens a PENDING
 *    session, good for ten minutes.
 * 2. OTP. The browser signs in with the phone `ADMIN_PHONE`, through Firebase
 *    phone auth, and posts that ID token. The server checks the number and
 *    that the OTP was entered just now, ends the pending session and opens an
 *    ACTIVE one under a NEW token, so a token seen before step 2 is useless.
 *
 * Each step is a separate Firebase sign-in. Neither alone opens `/admin`:
 * the Google password without the phone stops at step 2, and the phone
 * without the Google password never reaches it.
 *
 * Firestore keeps the SHA-256 of the token, never the token: a database
 * export must not be enough to act as the admin.
 */

export const ADMIN_SESSION_COLLECTION = 'adminSessions';

export const adminSessionSchema = z.object({
  /** The Firebase uid of the admin's Google account. */
  uid: z.string().min(1).max(128),
  step: z.enum(['google', 'active']),
  expiresAt: z.date(),
});

export const adminSessions = createRepository({
  collection: ADMIN_SESSION_COLLECTION,
  schema: adminSessionSchema,
});

/** The signed-in admin, as a page or a Server Action sees it. */
export interface AdminSession {
  uid: string;
  sessionId: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** A cookie token is 43 characters of base64url. Anything else is not ours. */
function isTokenShape(token: string | undefined): token is string {
  return token !== undefined && /^[\w-]{43}$/.test(token);
}

interface VerifiedToken {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  provider: string | null;
  /** When the person signed in, in milliseconds. */
  authTimeMs: number;
}

async function verify(idToken: string): Promise<VerifiedToken> {
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken, true);
    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email.toLowerCase() : null,
      emailVerified: decoded.email_verified === true,
      phoneNumber: typeof decoded.phone_number === 'string' ? decoded.phone_number : null,
      provider:
        typeof decoded.firebase.sign_in_provider === 'string'
          ? decoded.firebase.sign_in_provider
          : null,
      authTimeMs: decoded.auth_time * 1000,
    };
  } catch (error) {
    logger.warn('Rejected an admin ID token', {
      reason: error instanceof Error ? error.name : 'unknown',
    });
    throw new UnauthenticatedError('That sign-in could not be verified. Try again.');
  }
}

function assertConfigured(): void {
  if (!env.adminEnabled || !env.authEnabled) {
    throw new UnauthenticatedError('Admin sign-in is not set up for this deployment.');
  }
}

/**
 * Step 1. Checks the Google sign-in and opens a pending session.
 *
 * @returns the pending cookie token, and the phone the OTP goes to.
 * @throws {UnauthenticatedError} for any other account.
 */
export async function startAdminSignIn(
  idToken: string,
  now: Date = new Date(),
): Promise<{ token: string; maxAgeSeconds: number; phoneE164: string }> {
  assertConfigured();
  const verified = await verify(idToken);
  if (
    verified.provider !== 'google.com' ||
    !verified.emailVerified ||
    verified.email !== env.adminEmail
  ) {
    logger.warn('Admin sign-in refused at the Google step', { uid: verified.uid });
    throw new UnauthenticatedError('This Google account cannot open the admin dashboard.');
  }

  const token = newToken();
  await adminSessions.createWithId(hashToken(token), {
    uid: verified.uid,
    step: 'google',
    expiresAt: new Date(now.getTime() + ADMIN_PENDING_SECONDS * 1000),
  });
  logger.info('Admin passed the Google step', { uid: verified.uid });
  return { token, maxAgeSeconds: ADMIN_PENDING_SECONDS, phoneE164: env.adminPhone };
}

/**
 * Step 2. Checks the OTP sign-in against the pending session, and swaps the
 * pending session for an active one under a new token.
 *
 * @throws {UnauthenticatedError} when there is no pending session in this
 *   browser, it has expired, or the phone is not the admin phone.
 */
export async function finishAdminSignIn(
  pendingToken: string | undefined,
  idToken: string,
  now: Date = new Date(),
): Promise<{ token: string; maxAgeSeconds: number }> {
  assertConfigured();
  const pendingId = isTokenShape(pendingToken) ? hashToken(pendingToken) : null;
  const pending = pendingId === null ? null : await adminSessions.get(pendingId);
  if (
    pendingId === null ||
    pending === null ||
    pending.step !== 'google' ||
    pending.expiresAt.getTime() <= now.getTime()
  ) {
    throw new UnauthenticatedError('Your Google step has expired. Start again.');
  }

  const verified = await verify(idToken);
  const fresh = now.getTime() - verified.authTimeMs <= ADMIN_PENDING_SECONDS * 1000;
  if (verified.provider !== 'phone' || verified.phoneNumber !== env.adminPhone || !fresh) {
    logger.warn('Admin sign-in refused at the OTP step', { uid: pending.uid });
    throw new UnauthenticatedError('That OTP was not for the admin phone. Start again.');
  }

  const token = newToken();
  await adminSessions.createWithId(hashToken(token), {
    uid: pending.uid,
    step: 'active',
    expiresAt: new Date(now.getTime() + ADMIN_SESSION_SECONDS * 1000),
  });
  await adminSessions.softDelete(pendingId);
  await recordAdminAction({
    action: 'signed-in',
    targetType: 'admin',
    targetId: pending.uid,
    detail: 'Signed in with Google and an OTP.',
    adminUid: pending.uid,
  });
  return { token, maxAgeSeconds: ADMIN_SESSION_SECONDS };
}

/** The active admin session for a cookie token, or `null`. */
export async function verifyAdminSession(
  token: string | undefined,
  now: Date = new Date(),
): Promise<AdminSession | null> {
  if (!env.adminEnabled || !isTokenShape(token)) return null;
  const sessionId = hashToken(token);
  const session = await adminSessions.get(sessionId);
  if (session === null || session.step !== 'active') return null;
  if (session.expiresAt.getTime() <= now.getTime()) return null;
  return { uid: session.uid, sessionId };
}

/** Whether this browser has passed the Google step and waits for the OTP. */
export async function hasPendingAdminSignIn(
  token: string | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  if (!env.adminEnabled || !isTokenShape(token)) return false;
  const session = await adminSessions.get(hashToken(token));
  return (
    session !== null && session.step === 'google' && session.expiresAt.getTime() > now.getTime()
  );
}

/** The admin session of the current request, or `null`. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_COOKIE_NAME)?.value);
}

/**
 * The admin session, or a thrown `UnauthenticatedError`. The first line of
 * every admin Server Action: a Server Action is a public endpoint, whatever
 * page shows the button.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session === null) throw new UnauthenticatedError('Sign in to the admin dashboard again.');
  return session;
}

/** Ends the session the cookie names, pending or active. */
export async function endAdminSession(token: string | undefined): Promise<void> {
  if (!isTokenShape(token)) return;
  const sessionId = hashToken(token);
  const session = await adminSessions.get(sessionId);
  if (session === null) return;
  await adminSessions.softDelete(sessionId);
  if (session.step === 'active') {
    await recordAdminAction({
      action: 'signed-out',
      targetType: 'admin',
      targetId: session.uid,
      detail: 'Signed out.',
      adminUid: session.uid,
    });
  }
}

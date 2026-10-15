import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ADMIN_COOKIE_NAME, adminCookie, clearedAdminCookie, maskPhone } from '@/lib/admin-cookie';
import { env } from '@/lib/env';
import { mapHttpError } from '@/lib/http-errors';
import { logger } from '@/lib/logger';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import {
  endAdminSession,
  finishAdminSignIn,
  startAdminSignIn,
} from '@/services/admin-session.service';

/**
 * `POST /api/admin/session` — the admin's two sign-in steps. `DELETE` — sign
 * out of `/admin`. See ADR-0008 and `services/admin-session.service.ts`.
 *
 * `{ step: 'google', idToken }` checks the Google account and sets a pending
 * cookie. `{ step: 'otp', idToken }` checks the phone sign-in against that
 * cookie and swaps it for the admin session.
 *
 * Like `/api/auth/session`, this is a sign-in route, so it has no session to
 * require. The two ID tokens are the control.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 10 tries per visitor per 10 minutes, per instance. The admin needs two. */
const limiter = new RateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const bodySchema = z.object({
  step: z.enum(['google', 'otp']),
  idToken: z
    .string()
    .min(1)
    .max(8192)
    .regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'must be a JWT'),
});

/** Same rule as the session cookie: Secure everywhere except plain-HTTP localhost. */
function isSecureContext(): boolean {
  return !env.appUrl.startsWith('http://localhost') && !env.appUrl.startsWith('http://127.0.0.1');
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.adminEnabled) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const verdict = limiter.hit(clientIp(request.headers));
  if (!verdict.allowed) {
    logger.warn('Admin sign-in rate limit reached', {
      retryAfterSeconds: verdict.retryAfterSeconds,
    });
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many tries. Wait a few minutes, then try again.' },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Body must be { step, idToken }.' },
      { status: 400 },
    );
  }

  const store = await cookies();
  try {
    if (body.step === 'google') {
      const { token, maxAgeSeconds, phoneE164 } = await startAdminSignIn(body.idToken);
      store.set(adminCookie(token, maxAgeSeconds, isSecureContext()));
      // The browser needs the whole number to ask Firebase for the OTP. It
      // gets it only after the Google step passed.
      return NextResponse.json(
        { ok: true, phoneE164, phoneLabel: maskPhone(phoneE164) },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { token, maxAgeSeconds } = await finishAdminSignIn(
      store.get(ADMIN_COOKIE_NAME)?.value,
      body.idToken,
    );
    store.set(adminCookie(token, maxAgeSeconds, isSecureContext()));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const mapped = mapHttpError(error);
    if (!mapped.exposeDetail) logger.error('Admin sign-in failed', error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  store.set(clearedAdminCookie(isSecureContext()));
  try {
    await endAdminSession(token);
  } catch (error) {
    // The cookie is already cleared, so this browser IS signed out.
    logger.error('Ending the admin session failed', error);
  }
  return NextResponse.json({ ok: true });
}

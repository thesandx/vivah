/**
 * The cookie that carries the admin's session for `/admin`. Pure: it names
 * the cookie and builds its attributes, nothing else.
 *
 * The admin signs in in two steps (ADR-0008): Google, then an OTP to the
 * admin phone. The cookie holds a random token. Firestore keeps only its
 * SHA-256, in `adminSessions`, with the step the browser has reached.
 *
 * Not `__session`: the couple's Firebase session stays separate, so signing
 * in to `/admin` never signs a couple out, and the reverse. Requests reach
 * Cloud Run through the Cloudflare Worker, which forwards every cookie, so
 * the Firebase Hosting rule that strips other names (trap 20) does not apply.
 */

export const ADMIN_COOKIE_NAME = 'vivah_admin';

/** The Google step is good for this long. The OTP must follow within it. */
export const ADMIN_PENDING_SECONDS = 10 * 60;

/** A full admin session lasts one working day, then both steps again. */
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

export interface AdminCookie {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
}

/**
 * `sameSite: 'strict'`: the admin never arrives from another site's link, so
 * no cross-site request ever carries the admin session. `path: '/'` because
 * both `/admin` and `/api/admin/session` read it.
 */
export function adminCookie(token: string, maxAgeSeconds: number, secure: boolean): AdminCookie {
  return {
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/** The same cookie, expired: what sign-out sets. */
export function clearedAdminCookie(secure: boolean): AdminCookie {
  return adminCookie('', 0, secure);
}

/**
 * Shows enough of the admin phone to recognise it on the OTP step, and no
 * more: `+91 ••••• ••507`.
 */
export function maskPhone(e164: string): string {
  const tail = e164.slice(-3);
  const country = e164.startsWith('+91') ? '+91 ' : '';
  return `${country}••••• ••${tail}`;
}

/**
 * The cookie that ties a preview link to the first browser that opened it.
 *
 * Pure: it names the cookie and builds its attributes, nothing else.
 *
 * The PRD's rule is "no shareable link until payment". The WhatsApp message
 * carries `/p/<lead id>`. The first browser that opens it gets a random token
 * in this cookie, and the lead stores the same token. Every later visit must
 * present it, so a forwarded link shows "open it on the phone you used".
 *
 * Not `__session`: this is not a sign-in. Requests reach Cloud Run through the
 * Cloudflare Worker, which forwards every cookie, so the Firebase Hosting rule
 * that strips other cookie names (trap 20) does not apply on this path.
 */

export const PREVIEW_COOKIE_NAME = 'vivah_preview';

/** A preview link is valid for 48 hours. The cookie lives no longer. */
export const PREVIEW_LIFETIME_SECONDS = 48 * 60 * 60;

export interface PreviewCookie {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

/**
 * The cookie for one lead. Scoped to that lead's preview path, so two
 * previews on one phone keep two tokens and never overwrite each other.
 *
 * `sameSite: 'lax'` is required, not `strict`: the first visit is a link
 * tapped inside WhatsApp, which is a cross-site navigation.
 */
export function previewCookie(
  leadId: string,
  token: string,
  isSecureContext: boolean,
): PreviewCookie {
  return {
    name: PREVIEW_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isSecureContext,
    sameSite: 'lax',
    path: `/preview/${leadId}`,
    maxAge: PREVIEW_LIFETIME_SECONDS,
  };
}

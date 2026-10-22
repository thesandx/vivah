/**
 * Google Ads measurement: the names and checks the browser and the server
 * share. Pure, so a test needs no browser. ADR-0013 records the decision.
 */

/**
 * Where the click id from an ad is kept, in `sessionStorage`, until the
 * sign-up card sends it with the lead. It dies with the tab.
 */
export const GCLID_STORAGE_KEY = 'vivah_gclid';

/** Prefix of the `sessionStorage` key that stops a conversion counting twice in one tab. */
export const CONVERSION_SENT_PREFIX = 'vivah_conversion_sent:';

/** The two conversion actions made in Google Ads (see the setup guide). */
export type ConversionKind = 'signup' | 'purchase';

/**
 * A Google click id is URL-safe base64. Anything else is not stored, so a
 * crafted link cannot put arbitrary text on a lead.
 */
const GCLID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

export function parseGclid(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim();
  return GCLID_PATTERN.test(value) ? value : null;
}

/**
 * The `send_to` value of a conversion event: `AW-123456789/AbC-D_efG`.
 * `null` when the id or the label is not set, so the event is not sent.
 */
export function conversionTarget(adsId: string, label: string): string | null {
  return adsId === '' || label === '' ? null : `${adsId}/${label}`;
}

/** The URL of Google's tag library for this account. */
export function gtagScriptUrl(adsId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`;
}

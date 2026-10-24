/**
 * The invite's contact links: the WhatsApp RSVP, the phone number as people
 * read it, and the venue map. Pure, so it is tested without a browser.
 */

/**
 * A WhatsApp chat with the couple, with the reply already typed:
 * `Hi Radha & Shyam, I (Neha) will be attending the wedding!`.
 * `wa.me` takes the number as digits only, with no plus sign.
 */
export function rsvpWhatsAppUrl(
  phoneE164: string,
  bride: string,
  groom: string,
  guestName: string | null,
  /** A message to send instead of the guest's "I will be attending". */
  message?: string,
): string {
  const who = guestName === null ? 'I' : `I (${guestName})`;
  const text = message ?? `Hi ${bride} & ${groom}, ${who} will be attending the wedding!`;
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/**
 * A number as people in India write it: `+917983873235` → `+91 79838 73235`.
 * Other countries keep the E.164 form, which every phone can still dial.
 */
export function displayPhone(phoneE164: string): string {
  const india = /^\+91(\d{5})(\d{5})$/.exec(phoneE164);
  return india === null ? phoneE164 : `+91 ${india[1]} ${india[2]}`;
}

/** Hosts a Google Maps share link can have. The couple pastes one; no Maps API. */
const MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.com',
  'www.google.com',
  'google.com',
]);

/**
 * True for an `https` Google Maps link. The venue button opens only these, so
 * a stored value can never send a guest to another site.
 */
export function isGoogleMapsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || !MAPS_HOSTS.has(url.hostname)) return false;
  // goo.gl and google.com also serve other products; only their maps paths count.
  if (url.hostname === 'goo.gl') return url.pathname.startsWith('/maps');
  if (url.hostname === 'google.com' || url.hostname === 'www.google.com') {
    return url.pathname.startsWith('/maps');
  }
  return true;
}

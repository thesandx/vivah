/**
 * Guest names in invite links: `sara.vivah.online/Neha-ji` greets
 * "Neha ji". Pure, so it is tested without a request.
 *
 * The name comes from the URL, so anyone can type anything. It is only ever
 * rendered as text (React escapes it) and drawn into the link preview image,
 * so the risk is an odd greeting, not an injection. These rules keep the
 * greeting readable and short: letters in any script (Hindi names work),
 * spaces, and the dot and apostrophe found in real names.
 */

/** Long enough for "Sharma ji and family", short enough for one line. */
export const MAX_GUEST_NAME_LENGTH = 40;

/** Letters and combining marks in any script, then spaces, `.` and `'`. */
const ALLOWED = /^[\p{L}\p{M}][\p{L}\p{M} .']*$/u;

/**
 * The number the dashboard adds to a second guest of the same name:
 * `/Rahul-2`. Names never contain digits, so a trailing `-2` is always this
 * marker and never part of the name.
 */
const DUPLICATE_MARKER = /[-_+ ]\d{1,3}$/;

/** Decodes a path segment, or `null` for a broken encoding. */
function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * The display name for a guest link's last path segment, or `null` when it is
 * not a usable name. A hyphen or underscore reads as a space, so a couple can
 * share `/Neha-ji` without an encoded space in the link. The duplicate
 * marker is dropped: `/Rahul-2` greets "Rahul".
 */
export function parseGuestName(segment: string): string | null {
  const decoded = decodeSegment(segment);
  if (decoded === null) return null;
  const name = decoded
    .replace(DUPLICATE_MARKER, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name === '' || name.length > MAX_GUEST_NAME_LENGTH || !ALLOWED.test(name)) return null;
  // Capitalise the first letter only: `neha ji` → `Neha ji`. Every
  // word would give "Neha Ji", which is wrong for the honorific.
  return name.charAt(0).toLocaleUpperCase('en-IN') + name.slice(1);
}

/**
 * A path segment, encoded exactly once, whether it arrives encoded
 * (`Rahul%20Sharma`) or decoded (`राधा`).
 */
export function encodeGuestSegment(segment: string): string {
  return encodeURIComponent(decodeSegment(segment) ?? segment);
}

/** The path for a guest: `Neha ji` → `/Neha-ji`. */
export function guestPath(name: string): string {
  return `/${encodeURIComponent(name.trim().replace(/\s+/g, '-'))}`;
}

/**
 * The last path segment of a guest link the dashboard makes: `Rahul Sharma`
 * → `Rahul-Sharma`, and the second guest of that name → `Rahul-Sharma-2`.
 */
export function guestLinkSegment(name: string, copy: number): string {
  const base = guestPath(name).slice(1);
  return copy > 1 ? `${base}-${copy}` : base;
}

/**
 * The lookup key for a guest link segment: decoded, separators folded to one
 * hyphen, lowercased. `Rahul%20Sharma`, `rahul-sharma` and `Rahul_Sharma`
 * share one key, because they greet the same guest. `null` for a broken
 * encoding.
 */
export function guestLinkKey(segment: string): string | null {
  const decoded = decodeSegment(segment);
  if (decoded === null) return null;
  const key = decoded
    .replace(/[-_+\s]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return key === '' ? null : key;
}

/**
 * A couple's name as it is saved and shown: each word starts with a capital
 * and the rest is small, however it was typed. `riya SHARMA` → `Riya Sharma`,
 * `anne-marie` → `Anne-Marie`. Scripts without case, such as Devanagari, pass
 * through unchanged. Extra spaces fold to one.
 */
export function capitalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-IN')
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_match, before: string, letter: string) => `${before}${letter.toLocaleUpperCase('en-IN')}`,
    );
}

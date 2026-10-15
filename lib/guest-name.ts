/**
 * Guest names in invite links: `sara.vivah.online/Kartheek-ji` greets
 * "Kartheek ji". Pure, so it is tested without a request.
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
 * The display name for a guest link's last path segment, or `null` when it is
 * not a usable name. A hyphen or underscore reads as a space, so a couple can
 * share `/Kartheek-ji` without an encoded space in the link.
 */
export function parseGuestName(segment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  const name = decoded
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name === '' || name.length > MAX_GUEST_NAME_LENGTH || !ALLOWED.test(name)) return null;
  // Capitalise the first letter only: `kartheek ji` → `Kartheek ji`. Every
  // word would give "Kartheek Ji", which is wrong for the honorific.
  return name.charAt(0).toLocaleUpperCase('en-IN') + name.slice(1);
}

/** The path for a guest: `Kartheek ji` → `/Kartheek-ji`. */
export function guestPath(name: string): string {
  return `/${encodeURIComponent(name.trim().replace(/\s+/g, '-'))}`;
}

/** The seal's initials: `Radha`, `Shyam` → `R & S`. */
export function coupleInitials(bride: string, groom: string): string {
  const first = (name: string): string =>
    Array.from(name.trim())[0]?.toLocaleUpperCase('en-IN') ?? '';
  return [first(bride), first(groom)].filter((letter) => letter !== '').join(' & ');
}

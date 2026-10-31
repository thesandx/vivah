/**
 * The `#details` link: ads and the Instagram and Facebook bios end in it,
 * and the home page then opens the sign-up card full screen.
 *
 * A link tool can add text after the hash. Meta puts its "URL parameters"
 * at the very end of the link, so `?utm_source=x#details` can arrive as
 * `#details?utm_source=x`, and a share can add `&fbclid=…`. The screen must
 * still open, and the tags must still reach the visit report, which reads
 * the query string. Pure, so it is tested without a browser.
 */

export const DETAILS_HASH = '#details';

/** True when this hash asks for the full-screen form, with or without text after it. */
export function isDetailsHash(hash: string): boolean {
  return hash === DETAILS_HASH || /^#details[?&/]/.test(hash);
}

/**
 * The tidy address for a `#details` link that carries parameters in its
 * hash: they move into the query string, and the hash becomes `#details`.
 * A parameter already in the query string keeps its value. Returns `null`
 * when there is nothing to move.
 */
export function tidyDetailsUrl(pathname: string, search: string, hash: string): string | null {
  if (!isDetailsHash(hash) || hash === DETAILS_HASH) return null;
  const extra = new URLSearchParams(hash.slice(DETAILS_HASH.length + 1));
  const params = new URLSearchParams(search);
  for (const [key, value] of extra) {
    if (!params.has(key)) params.append(key, value);
  }
  const query = params.toString();
  return `${pathname}${query === '' ? '' : `?${query}`}${DETAILS_HASH}`;
}

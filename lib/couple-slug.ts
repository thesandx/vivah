/**
 * Couple slugs: the first label of an invite host, e.g. `raadha-shyam` in
 * `raadha-shyam.vivah.online`. Pure, so it is tested without Firestore.
 *
 * A slug is a DNS label, so it follows DNS rules: lowercase ASCII letters,
 * digits and hyphens, no hyphen at either end, 63 characters at most. The
 * Cloudflare certificate covers one level below the root domain only, so a
 * slug never contains a dot.
 */

/** DNS allows 63 characters in a label. Shorter keeps the link readable. */
export const MAX_SLUG_LENGTH = 40;

/** Each name part is cut to this length before the two are joined. */
const MAX_NAME_PART_LENGTH = 18;

/**
 * Labels that belong to the product, not to a couple. A wedding never gets one
 * of these, so a later `app.vivah.online` or `www` redirect stays possible.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'app',
  'blog',
  'dashboard',
  'help',
  'mail',
  'my',
  'pay',
  'preview',
  'site',
  'static',
  'support',
  'www',
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Turns one typed name into a slug part: `Raadha Rani` → `raadha-rani`.
 *
 * Accents are removed (`Józef` → `jozef`). A name in a non-Latin script, such
 * as Devanagari, has no ASCII form and returns `''`; the caller falls back to
 * the other name, or asks for an English spelling.
 */
export function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_NAME_PART_LENGTH)
    .replace(/-+$/g, '');
}

/** True when `slug` is a usable couple slug: valid shape and not reserved. */
export function isValidCoupleSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug) &&
    !slug.includes('--') &&
    !RESERVED_SLUGS.has(slug)
  );
}

/**
 * The preferred slug for a couple: `raadha-shyam`. Returns `null` when neither
 * name has an ASCII form, or the result is reserved.
 *
 * This is the FIRST choice only. The payment step checks that it is free, and
 * appends `-2`, `-3` and so on when it is taken — see `withSuffix`.
 */
export function buildCoupleSlug(bride: string, groom: string): string | null {
  const parts = [slugifyName(bride), slugifyName(groom)].filter((part) => part !== '');
  const slug = parts.join('-');
  return isValidCoupleSlug(slug) ? slug : null;
}

/** `raadha-shyam` + 2 → `raadha-shyam-2`. Number 1 is the bare slug. */
export function withSuffix(slug: string, attempt: number): string {
  return attempt <= 1 ? slug : `${slug}-${attempt}`;
}

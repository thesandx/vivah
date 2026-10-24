import { isOldSampleSlug, isSampleSlug } from '@/lib/sample-invite';

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

/**
 * True when no couple can take `slug`: the product's own labels and the
 * sample invite's addresses, old and current.
 */
function isKeptForVivah(slug: string): boolean {
  return RESERVED_SLUGS.has(slug) || isSampleSlug(slug) || isOldSampleSlug(slug);
}

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

/**
 * The first name of a typed name, as a slug part: `Anushka Kumari` →
 * `anushka`. Couples often type a full name, and a link built from two full
 * names is long and hard to share, so suggestions use first names only. A
 * leading word with no ASCII form is skipped, so `राधा Rani` gives `rani`.
 */
export function slugifyFirstName(name: string): string {
  for (const word of name.trim().split(/\s+/)) {
    const part = slugifyName(word);
    if (part !== '') return part;
  }
  return '';
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

/** How many numbered fallbacks (`-2` to `-9`) to try after the word forms. */
const MAX_SUFFIX = 9;

/**
 * Ready-made addresses for a couple, best first: `radha-shyam`,
 * `shyam-radha`, `radha-weds-shyam`, `shyam-weds-radha`, `radha-and-shyam`,
 * `shyam-and-radha`, then `radha-shyam-2` to `-9`. Invalid and duplicate
 * forms are dropped. The preview page offers the first ones that are free, so
 * a couple never sees a suggestion they cannot have.
 *
 * Only first names are used: `Anushka Kumari` and `Sandeep Kumar Jha` give
 * `anushka-sandeep`, never `anushka-kumari-sandeep-kumar-jha`.
 */
export function slugCandidates(bride: string, groom: string): string[] {
  const b = slugifyFirstName(bride);
  const g = slugifyFirstName(groom);
  const pairs =
    b !== '' && g !== ''
      ? [
          [b, g],
          [g, b],
        ]
      : [[b || g]];
  const words = pairs.flatMap((pair) => [
    pair.join('-'),
    ...(pair.length === 2 ? [pair.join('-weds-'), pair.join('-and-')] : []),
  ]);
  const ordered = [
    ...words.filter((_, index) => index % 3 === 0),
    ...words.filter((_, index) => index % 3 === 1),
    ...words.filter((_, index) => index % 3 === 2),
  ];
  const base = ordered[0] ?? '';
  const numbered = Array.from({ length: MAX_SUFFIX - 1 }, (_, index) =>
    withSuffix(base, index + 2),
  );
  return [...new Set([...ordered, ...numbered])].filter(
    (slug) => isValidCoupleSlug(slug) && !isKeptForVivah(slug),
  );
}

/**
 * Why `slug` cannot be an address, in words for the couple, or `null` when it
 * can. Availability is a separate check: this looks at the shape only.
 */
export function slugProblem(slug: string): string | null {
  if (slug.length < 2) return 'Use at least 2 characters.';
  if (slug.length > MAX_SLUG_LENGTH) return `Use ${MAX_SLUG_LENGTH} characters or fewer.`;
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) {
    return 'Use lowercase letters, numbers and single hyphens. Start and end with a letter or number.';
  }
  if (isKeptForVivah(slug)) return 'This address is kept for Vivah. Choose another.';
  return null;
}

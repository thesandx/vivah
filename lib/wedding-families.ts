/**
 * The couple's families, for the invite's "Our Families" section: for the
 * groom's side and the bride's side, the grandparents' and the parents'
 * names, and the family name the card prints as "Gupta Parivar". Pure, so
 * the rules and the form parsing are tested without a request or a database.
 *
 * Every name is optional. The couple adds them from the dashboard after
 * payment, and an admin can add them from `/admin`. The unpaid preview shows
 * the section with faint placeholders instead. The live invite shows a side
 * only when it has at least one name, and hides the section when neither
 * side has one.
 *
 * The couple types each name as guests should read it, title included:
 * `Smt. Muni Devi`, `Late Shri Jagdev Prasad Gupta`, `Dr. Rajesh Gupta`.
 * Families differ too much for the app to add a title.
 *
 * Two sides with five short fields each: a bounded map on the wedding
 * document, not a subcollection. See docs/firestore-modeling.md.
 */

import { z } from 'zod';

import type { NameOrder } from '@/lib/couple-names';

/** The two sides, in the order the dashboard lists them by default. */
export const FAMILY_SIDES = ['groom', 'bride'] as const;
export type FamilySide = (typeof FAMILY_SIDES)[number];

/** The names on one side, in the order the form asks for them. */
export const FAMILY_FIELDS = ['title', 'grandmother', 'grandfather', 'mother', 'father'] as const;
export type FamilyField = (typeof FAMILY_FIELDS)[number];

/** The longest name, in characters: room for a title and three words. */
export const FAMILY_NAME_MAX = 60;

const familyName = z.string().trim().min(1).max(FAMILY_NAME_MAX).nullable();

/** One side, as the wedding document stores it. `null` means "not added". */
export const familySchema = z.object({
  /**
   * The card's heading, exactly as the couple wrote it: `Gupta Parivar`,
   * `The Gupta Family`. Absent or `null`: built from the names (`familyTitle`).
   */
  title: familyName.optional(),
  /**
   * The first release stored only the family name (`Gupta`) and printed
   * `Gupta Parivar`. Still read, never written.
   */
  surname: familyName.optional(),
  /** The couple chose "No title": the card shows no heading at all. */
  noTitle: z.boolean().optional(),
  grandmother: familyName,
  grandfather: familyName,
  mother: familyName,
  father: familyName,
});

export type Family = z.infer<typeof familySchema>;

/** Both sides. Optional on the wedding: absent means nothing added yet. */
export const weddingFamiliesSchema = z.object({
  groom: familySchema,
  bride: familySchema,
});

export type WeddingFamilies = z.infer<typeof weddingFamiliesSchema>;

export const EMPTY_FAMILY: Family = {
  title: null,
  grandmother: null,
  grandfather: null,
  mother: null,
  father: null,
};

/** What the card and the form call each side and each field. */
export const FAMILY_SIDE_LABELS: Record<FamilySide, { family: string; childOf: string }> = {
  groom: { family: 'Groom’s family', childOf: 'Son of' },
  bride: { family: 'Bride’s family', childOf: 'Daughter of' },
};

export const FAMILY_FIELD_LABELS: Record<FamilyField, string> = {
  title: 'Family title',
  grandmother: 'Grandmother',
  grandfather: 'Grandfather',
  mother: 'Mother',
  father: 'Father',
};

/** True when a side has a grandparent's or a parent's name. */
export function familyHasNames(family: Family | undefined): family is Family {
  return (
    family !== undefined &&
    [family.grandmother, family.grandfather, family.mother, family.father].some(
      (name) => name !== null,
    )
  );
}

/**
 * The family's surname, from the names: the first release's saved family
 * name, else the last word of the father's name (then the grandfather's).
 * `Shri Rajesh Gupta` gives `Gupta`. A single word gives nothing.
 */
export function familySurname(family: Family): string | null {
  const fromName = (name: string | null): string | null => {
    const words = name?.split(/\s+/).filter((word) => word !== '') ?? [];
    // One word is a first name or a title, not a family name.
    if (words.length < 2) return null;
    const last = words.at(-1) ?? '';
    return /^[\p{L}][\p{L}'’-]*$/u.test(last) ? last : null;
  };
  const surname = family.surname ?? fromName(family.father) ?? fromName(family.grandfather);
  return surname?.replace(/\s+parivar$/i, '') ?? null;
}

/** The first word of a name: `Priya Sharma` gives `Priya`. */
function firstWord(name: string | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? '';
}

/**
 * The card's heading. "No title" shows none. The couple's own words come
 * next, as written: `Gupta Parivar` or `The Gupta Family`. Without them, the
 * surname gives `Gupta Parivar`, and without a surname the bride's or the
 * groom's first name gives `Priya's Family` (only the first word of a full
 * name).
 */
export function familyTitle(family: Family, firstName?: string): string | null {
  if (family.noTitle === true) return null;
  if (family.title !== undefined && family.title !== null) return family.title;
  const surname = familySurname(family);
  if (surname !== null) return `${surname} Parivar`;
  const first = firstWord(firstName);
  return first === '' ? null : `${first}’s Family`;
}

/**
 * Headings the form offers to fill with one tap, for a couple who does not
 * want to write one: `Malhotra Parivar`, `The Malhotra Family`,
 * `Priya's Family`, `Vadhu Paksh` (the bride's side, as printed cards say)
 * and `The Bride's Family`. Each appears once.
 */
export function familyTitleSuggestions(
  side: FamilySide,
  family: Family,
  firstName: string,
): string[] {
  const surname = familySurname(family);
  const first = firstWord(firstName);
  const suggestions = [
    ...(surname === null ? [] : [`${surname} Parivar`, `The ${surname} Family`]),
    ...(first === '' ? [] : [`${first}’s Family`]),
    side === 'bride' ? 'Vadhu Paksh' : 'Var Paksh',
    side === 'bride' ? 'The Bride’s Family' : 'The Groom’s Family',
  ];
  return [...new Set(suggestions)];
}

/** The sides in the couple's name order: the bride's family first by default. */
export function orderedSides(nameOrder: NameOrder | undefined): [FamilySide, FamilySide] {
  return nameOrder === 'groom-first' ? ['groom', 'bride'] : ['bride', 'groom'];
}

/** The form field for one name on one side: `groom.mother`. */
export function familyFieldName(side: FamilySide, field: FamilyField | 'noTitle'): string {
  return `${side}.${field}`;
}

export type FamiliesResult =
  { ok: true; families: WeddingFamilies } | { ok: false; errors: Record<string, string> };

const fieldSchema = z
  .string()
  .trim()
  .max(FAMILY_NAME_MAX, `Keep this under ${FAMILY_NAME_MAX} characters.`)
  .transform((value) => (value === '' ? null : value.replace(/\s+/g, ' ')));

/**
 * Reads the families form. An empty field clears that name. Each problem is
 * keyed by its field name (`bride.father`), for the form to show under the
 * input.
 */
export function parseWeddingFamilies(form: Record<string, unknown>): FamiliesResult {
  const errors: Record<string, string> = {};
  const read = (side: FamilySide): Family => {
    const family: Family = { ...EMPTY_FAMILY };
    if (form[familyFieldName(side, 'noTitle')] === '1') family.noTitle = true;
    for (const field of FAMILY_FIELDS) {
      const key = familyFieldName(side, field);
      const raw = form[key];
      const parsed = fieldSchema.safeParse(typeof raw === 'string' ? raw : '');
      if (parsed.success) family[field] = parsed.data;
      else errors[key] = parsed.error.issues[0]?.message ?? 'Check this name.';
    }
    if (family.noTitle === true) family.title = null;
    return family;
  };
  const families = { groom: read('groom'), bride: read('bride') };
  return Object.keys(errors).length === 0 ? { ok: true, families } : { ok: false, errors };
}

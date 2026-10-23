/**
 * The wedding functions an invite can list besides the wedding itself:
 * tilak, haldi, mehndi, sangeet and reception. Each has its own date, time
 * and venue. Pure, so the rules, the form parsing and the order are tested
 * without a request or a database.
 *
 * A couple picks the functions on step 3 of the sign-up card. The lead keeps
 * only the kinds; publishing copies them to the wedding with empty details,
 * and the couple fills those in from the dashboard. The invite shows the
 * "Wedding Festivities" section only when at least one function is chosen,
 * so a wedding never shows there alone.
 *
 * The list is bounded (one entry per kind, five kinds), so it is an array on
 * the document, not a subcollection. See docs/firestore-modeling.md.
 */

import { z } from 'zod';

import { isGoogleMapsUrl } from '@/lib/invite-contact';

/** The functions a couple can add, in the order they usually happen. */
export const FUNCTION_KINDS = ['tilak', 'haldi', 'mehndi', 'sangeet', 'reception'] as const;
export type FunctionKind = (typeof FUNCTION_KINDS)[number];

/** A card on the invite: a function, or the wedding itself. */
export type FestivityKind = FunctionKind | 'wedding';

/** The name and the small capitals over it, as the invite prints them. */
export const FESTIVITY_LABELS: Record<FestivityKind, { name: string; tagline: string }> = {
  tilak: { name: 'Tilak', tagline: 'Blessings' },
  haldi: { name: 'Haldi', tagline: 'The golden glow' },
  mehndi: { name: 'Mehndi', tagline: 'Henna & song' },
  sangeet: { name: 'Sangeet', tagline: 'Music night' },
  wedding: { name: 'Wedding', tagline: 'The muhurat' },
  reception: { name: 'Reception', tagline: 'The celebration' },
};

/**
 * Where each card goes when two share a day and neither has a time, and
 * where a function with no date yet sits around the wedding: before it,
 * except the reception, which follows it.
 */
const ORDER: readonly FestivityKind[] = [
  'tilak',
  'haldi',
  'mehndi',
  'sangeet',
  'wedding',
  'reception',
];

export function isFunctionKind(value: unknown): value is FunctionKind {
  return typeof value === 'string' && (FUNCTION_KINDS as readonly string[]).includes(value);
}

/**
 * The kinds a couple chose, cleaned: known kinds only, each once, in the
 * usual order. Anything else in the input is dropped.
 */
export function cleanFunctionKinds(values: readonly unknown[]): FunctionKind[] {
  return FUNCTION_KINDS.filter((kind) => values.includes(kind));
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One function as the wedding document stores it. `null` means "not added yet". */
export const weddingFunctionSchema = z.object({
  kind: z.enum(FUNCTION_KINDS),
  /** `YYYY-MM-DD`. */
  date: z.iso.date().nullable(),
  /** `HH:MM`, 24-hour, India Standard Time. */
  time: z.string().regex(TIME_PATTERN).nullable(),
  /** The place, in one line: `Deera Nilayam Lawns, Chhatarpur`. */
  venue: z.string().trim().min(1).max(100).nullable(),
  /** A Google Maps share link, pasted by the couple. */
  mapsUrl: z.string().max(500).refine(isGoogleMapsUrl, 'Not a Google Maps link.').nullable(),
});

export type WeddingFunction = z.infer<typeof weddingFunctionSchema>;

/** The stored list: at most one entry per kind. */
export const weddingFunctionsSchema = z
  .array(weddingFunctionSchema)
  .max(FUNCTION_KINDS.length)
  .refine(
    (list) => new Set(list.map((entry) => entry.kind)).size === list.length,
    'Each function can appear once.',
  );

/** A function chosen on the sign-up card: the kind, with nothing added yet. */
export function emptyFunction(kind: FunctionKind): WeddingFunction {
  return { kind, date: null, time: null, venue: null, mapsUrl: null };
}

/** A card on the invite: what `ShubhVivahInvite` draws for one festivity. */
export interface Festivity {
  kind: FestivityKind;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapsUrl: string | null;
}

/**
 * The cards in the order guests read them: by date, then by time. A card
 * with no date yet takes the wedding's date and sits before the wedding (a
 * reception after it), so an unpaid preview reads Tilak, Haldi, Mehndi,
 * Sangeet, Wedding, Reception. On one day, a card with a time comes in time
 * order; one with no time keeps its usual place. A change of date in the
 * dashboard moves the card on the next load.
 */
export function sortFestivities(cards: readonly Festivity[]): Festivity[] {
  const weddingDate = cards.find((card) => card.kind === 'wedding')?.date ?? null;
  const weddingIndex = ORDER.indexOf('wedding');
  const key = (card: Festivity): [string, string, number] => {
    const index = ORDER.indexOf(card.kind);
    if (card.date !== null) return [card.date, card.time ?? '', index];
    // No date yet: around the wedding, by the usual order. `~` sorts after
    // every `HH:MM`, so an undated reception follows the wedding's time.
    return [weddingDate ?? '9999-12-31', index < weddingIndex ? '' : '~', index];
  };
  return cards
    .map((card) => ({ card, key: key(card) }))
    .sort((a, b) => {
      for (let i = 0; i < 3; i += 1) {
        const left = a.key[i] as string | number;
        const right = b.key[i] as string | number;
        if (left < right) return -1;
        if (left > right) return 1;
      }
      return 0;
    })
    .map(({ card }) => card);
}

/**
 * Every card for the invite's "Wedding Festivities" section: the functions
 * plus the wedding, sorted. Empty when no function is chosen, so the
 * section hides rather than showing the wedding alone.
 */
export function festivityCards(
  functions: readonly WeddingFunction[],
  wedding: Omit<Festivity, 'kind'>,
): Festivity[] {
  if (functions.length === 0) return [];
  return sortFestivities([...functions, { kind: 'wedding', ...wedding }]);
}

/** The day as the festivity card prints it: `Mon · 28 Dec 2026`. */
export function formatFestivityDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  // From the parts, like `formatWeddingDate`, so server and browser agree.
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('weekday')} · ${part('day')} ${part('month')} ${part('year')}`;
}

/** An empty field clears the value: `''` becomes `null`. */
const optionalField = (schema: z.ZodType<string>) =>
  z.union([z.literal(''), schema]).transform((value) => (value === '' ? null : value));

const functionFormSchema = z.object({
  date: optionalField(z.iso.date('Enter a date like 2026-12-28.')),
  time: optionalField(z.string().regex(TIME_PATTERN, 'Enter a time like 19:00.')),
  venue: optionalField(z.string().trim().max(100, 'Keep this under 100 characters.')),
  mapsUrl: optionalField(
    z
      .string()
      .trim()
      .max(500, 'Keep this under 500 characters.')
      .refine(isGoogleMapsUrl, 'Paste the link from Google Maps > Share.'),
  ),
});

/** The form field for one detail of one function: `haldi.date`. */
export function functionFieldName(
  kind: FunctionKind,
  field: 'on' | 'date' | 'time' | 'venue' | 'mapsUrl',
): string {
  return `${kind}.${field}`;
}

export type FunctionsResult =
  { ok: true; functions: WeddingFunction[] } | { ok: false; errors: Record<string, string> };

/**
 * Reads the dashboard's functions form. A function is kept when its box is
 * ticked (`haldi.on`). Each problem is keyed by its field name, for the form
 * to show under the input.
 */
export function parseWeddingFunctions(form: Record<string, unknown>): FunctionsResult {
  const text = (key: string): string => {
    const value = form[key];
    return typeof value === 'string' ? value.trim() : '';
  };
  const functions: WeddingFunction[] = [];
  const errors: Record<string, string> = {};
  for (const kind of FUNCTION_KINDS) {
    if (text(functionFieldName(kind, 'on')) === '') continue;
    const parsed = functionFormSchema.safeParse({
      date: text(functionFieldName(kind, 'date')),
      time: text(functionFieldName(kind, 'time')),
      venue: text(functionFieldName(kind, 'venue')),
      mapsUrl: text(functionFieldName(kind, 'mapsUrl')),
    });
    if (parsed.success) {
      functions.push({ kind, ...parsed.data });
      continue;
    }
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== 'string') continue;
      errors[`${kind}.${field}`] ??= issue.message;
    }
  }
  return Object.keys(errors).length === 0 ? { ok: true, functions } : { ok: false, errors };
}

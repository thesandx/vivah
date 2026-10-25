/**
 * Search, filter and sort for the admin lists. Pure, so every rule is tested
 * without a request or a database.
 *
 * The lists are small (one row per couple), so `/admin` loads them whole and
 * filters here, on the server. That gives any sort order with no composite
 * index per order, and the URL holds the filters, so a view can be
 * bookmarked or reloaded.
 */

import type { NameOrder } from '@/lib/couple-names';
import { previewClosed } from '@/lib/preview-timer';

/** What the admin sees of a wedding's state. */
export type WeddingState = 'live' | 'unavailable' | 'deleted';

export interface WeddingRow {
  id: string;
  slug: string;
  bride: string;
  groom: string;
  nameOrder?: NameOrder | undefined;
  /** `YYYY-MM-DD`, or `null`. */
  weddingDate: string | null;
  ownerPhoneE164: string;
  status?: 'live' | 'unavailable' | undefined;
  createdAt: Date;
  deletedAt: Date | null;
}

export function weddingState(row: Pick<WeddingRow, 'status' | 'deletedAt'>): WeddingState {
  if (row.deletedAt !== null) return 'deleted';
  return row.status === 'unavailable' ? 'unavailable' : 'live';
}

/** What the admin sees of a preview's state. */
export type LeadState = 'sent' | 'opened' | 'expired' | 'paid' | 'deleted';

export interface LeadRow {
  id: string;
  bride: string;
  groom: string;
  nameOrder?: NameOrder | undefined;
  weddingDate: string | null;
  phoneE164: string;
  status: 'preview-sent' | 'opened' | 'paid';
  expiresAt: Date;
  /** When the preview's 30 minutes end. Absent until the link first opens. */
  viewEndsAt?: Date | null | undefined;
  createdAt: Date;
  deletedAt: Date | null;
  weddingSlug?: string | undefined;
}

/** When a preview closes, for sorting: the 30 minutes once started, else the link's expiry. */
function closesAt(row: LeadRow): number {
  return (row.viewEndsAt ?? row.expiresAt).getTime();
}

/**
 * The admin's line for when a preview closes: "12 min left" while its 30
 * minutes run, the link's expiry before it is opened, `null` once closed.
 */
export function previewTimeNote(row: LeadRow, now: Date): string | null {
  const state = leadState(row, now);
  if (state !== 'sent' && state !== 'opened') return null;
  if (row.viewEndsAt === undefined || row.viewEndsAt === null) {
    return `timer starts on first open · link expires ${formatAdminTime(row.expiresAt)}`;
  }
  const minutes = Math.ceil((row.viewEndsAt.getTime() - now.getTime()) / 60_000);
  return `${minutes} min left · closes ${formatAdminTime(row.viewEndsAt)}`;
}

export function leadState(row: LeadRow, now: Date): LeadState {
  if (row.deletedAt !== null) return 'deleted';
  if (row.status === 'paid') return 'paid';
  if (previewClosed(row, now)) return 'expired';
  return row.status === 'opened' ? 'opened' : 'sent';
}

/** One choice in a filter or sort menu: its URL value and its label. */
export interface Choice<T extends string> {
  value: T;
  label: string;
}

export const WEDDING_STATE_CHOICES = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'unavailable', label: 'Unavailable' },
] as const satisfies readonly Choice<string>[];

export const WEDDING_WHEN_CHOICES = [
  { value: 'all', label: 'Any date' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'no-date', label: 'No date yet' },
] as const satisfies readonly Choice<string>[];

export const WEDDING_SORT_CHOICES = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'wedding-soonest', label: 'Wedding date, soonest' },
  { value: 'wedding-latest', label: 'Wedding date, latest' },
  { value: 'names', label: 'Names, A to Z' },
  { value: 'address', label: 'Address, A to Z' },
] as const satisfies readonly Choice<string>[];

/** The Deleted tab sorts by when an invite was deleted first, then as the Invites tab. */
export const DELETED_SORT_CHOICES = [
  { value: 'recently-deleted', label: 'Deleted most recently' },
  ...WEDDING_SORT_CHOICES,
] as const satisfies readonly Choice<string>[];

export const LEAD_STATE_CHOICES = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Not opened' },
  { value: 'opened', label: 'Opened' },
  { value: 'expired', label: 'Expired' },
  { value: 'paid', label: 'Paid' },
  { value: 'deleted', label: 'Deleted' },
] as const satisfies readonly Choice<string>[];

export const LEAD_SORT_CHOICES = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'expiring', label: 'Expiring soonest' },
  { value: 'names', label: 'Names, A to Z' },
] as const satisfies readonly Choice<string>[];

type Values<T extends readonly Choice<string>[]> = T[number]['value'];

export interface WeddingFilters {
  q: string;
  state: Values<typeof WEDDING_STATE_CHOICES>;
  when: Values<typeof WEDDING_WHEN_CHOICES>;
  sort: Values<typeof DELETED_SORT_CHOICES>;
}

export interface LeadFilters {
  q: string;
  state: Values<typeof LEAD_STATE_CHOICES>;
  sort: Values<typeof LEAD_SORT_CHOICES>;
}

/** URL search params as Next.js hands them to a page. */
export type SearchParams = Record<string, string | string[] | undefined>;

function first(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function pick<T extends readonly Choice<string>[]>(choices: T, value: string): Values<T> {
  const found = choices.find((choice) => choice.value === value) ?? choices[0];
  // Every choice list is a non-empty literal, so `found` is always set.
  return (found?.value ?? '') as Values<T>;
}

/**
 * Reads the filters from the URL. An unknown value falls back to the first
 * choice. The Deleted tab has no state menu, and sorts by delete time first.
 */
export function parseWeddingFilters(
  params: SearchParams,
  tab: 'invites' | 'deleted' = 'invites',
): WeddingFilters {
  return {
    q: first(params, 'q').slice(0, 80),
    state: tab === 'deleted' ? 'all' : pick(WEDDING_STATE_CHOICES, first(params, 'state')),
    when: pick(WEDDING_WHEN_CHOICES, first(params, 'when')),
    sort:
      tab === 'deleted'
        ? pick(DELETED_SORT_CHOICES, first(params, 'sort'))
        : pick(WEDDING_SORT_CHOICES, first(params, 'sort')),
  };
}

export function parseLeadFilters(params: SearchParams): LeadFilters {
  return {
    q: first(params, 'q').slice(0, 80),
    state: pick(LEAD_STATE_CHOICES, first(params, 'state')),
    sort: pick(LEAD_SORT_CHOICES, first(params, 'sort')),
  };
}

/**
 * True when the search text is in the names, the address or the phone
 * number. A number matches on its digits, so `95463` finds `+91 95463 42507`.
 */
function matches(query: string, texts: readonly string[], phoneE164: string): boolean {
  if (query === '') return true;
  const needle = query.toLowerCase();
  if (texts.some((text) => text.toLowerCase().includes(needle))) return true;
  const digits = needle.replace(/\D/g, '');
  return digits.length >= 3 && phoneE164.replace(/\D/g, '').includes(digits);
}

const byNames = (a: { bride: string; groom: string }, b: { bride: string; groom: string }) =>
  `${a.bride} ${a.groom}`.localeCompare(`${b.bride} ${b.groom}`, 'en', { sensitivity: 'base' });

/** Dated weddings by date; undated ones always last, whatever the direction. */
function byWeddingDate(direction: 1 | -1) {
  return (a: WeddingRow, b: WeddingRow): number => {
    if (a.weddingDate === b.weddingDate) return 0;
    if (a.weddingDate === null) return 1;
    if (b.weddingDate === null) return -1;
    return a.weddingDate < b.weddingDate ? -direction : direction;
  };
}

/**
 * Filters and sorts the weddings. `today` is `YYYY-MM-DD` in India, so
 * "upcoming" includes a wedding happening today.
 */
export function filterWeddings<T extends WeddingRow>(
  rows: readonly T[],
  filters: WeddingFilters,
  today: string,
): T[] {
  const kept = rows.filter((row) => {
    if (filters.state !== 'all' && weddingState(row) !== filters.state) return false;
    if (filters.when === 'upcoming' && (row.weddingDate === null || row.weddingDate < today)) {
      return false;
    }
    if (filters.when === 'past' && (row.weddingDate === null || row.weddingDate >= today)) {
      return false;
    }
    if (filters.when === 'no-date' && row.weddingDate !== null) return false;
    return matches(filters.q, [row.bride, row.groom, row.slug], row.ownerPhoneE164);
  });

  const sorters: Record<WeddingFilters['sort'], (a: T, b: T) => number> = {
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    oldest: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    'wedding-soonest': byWeddingDate(1),
    'wedding-latest': byWeddingDate(-1),
    names: byNames,
    address: (a, b) => a.slug.localeCompare(b.slug),
    'recently-deleted': (a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0),
  };
  return kept.sort(sorters[filters.sort]);
}

export function filterLeads<T extends LeadRow>(
  rows: readonly T[],
  filters: LeadFilters,
  now: Date,
): T[] {
  const kept = rows.filter((row) => {
    if (filters.state !== 'all' && leadState(row, now) !== filters.state) return false;
    return matches(filters.q, [row.bride, row.groom, row.weddingSlug ?? ''], row.phoneE164);
  });

  const sorters: Record<LeadFilters['sort'], (a: T, b: T) => number> = {
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    oldest: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    expiring: (a, b) => closesAt(a) - closesAt(b),
    names: byNames,
  };
  return kept.sort(sorters[filters.sort]);
}

/** Counts per state, for the numbers on the filter chips. */
export function countBy<T, K extends string>(rows: readonly T[], key: (row: T) => K) {
  const counts = new Map<K, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return counts;
}

/** A moment as the admin reads it, in India time: `15 Oct 2026, 2:45 pm`. */
export function formatAdminTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

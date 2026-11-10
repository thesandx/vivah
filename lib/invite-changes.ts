/**
 * What a couple changed on their live invite, line by line, for the change
 * log on `/admin/invites/<id>` (ADR-0020). Pure, so each comparison is tested
 * without a database.
 *
 * A save from the dashboard becomes one entry with one line per field that
 * changed. A line holds the old and the new value as the invite shows them.
 * A save that changed nothing makes no entry.
 */

import { z } from 'zod';

import { NAME_ORDER_LABELS, type NameOrder } from '@/lib/couple-names';
import {
  FAMILY_FIELD_LABELS,
  FAMILY_FIELDS,
  FAMILY_SIDE_LABELS,
  FAMILY_SIDES,
  type WeddingFamilies,
} from '@/lib/wedding-families';
import { FESTIVITY_LABELS, type WeddingFunction } from '@/lib/wedding-functions';

/** The part of the dashboard a save came from. */
export const INVITE_CHANGE_AREAS = [
  'details',
  'functions',
  'families',
  'song',
  'guest-links',
] as const;
export type InviteChangeArea = (typeof INVITE_CHANGE_AREAS)[number];

export const INVITE_CHANGE_AREA_LABELS: Record<InviteChangeArea, string> = {
  details: 'Invite details',
  functions: 'Functions',
  families: 'Families',
  song: 'Song',
  'guest-links': 'Guest invite links',
};

/** A value as long as the longest field the dashboard takes (a Maps link). */
const VALUE_MAX = 500;

/** The most lines one save can make: every family field on both sides is 10. */
export const MAX_CHANGE_LINES = 60;

export const inviteChangeLineSchema = z.object({
  /** What changed, as the admin reads it: `Venue`, `Haldi time`. */
  label: z.string().min(1).max(80),
  /** `null` when the field was empty, or for an event such as "Guest link made". The card then shows only the new value. */
  from: z.string().max(VALUE_MAX).nullable(),
  /** `null` when the field is now empty. */
  to: z.string().max(VALUE_MAX).nullable(),
});

export type InviteChangeLine = z.infer<typeof inviteChangeLineSchema>;

/** The details form, as the wedding stores it. */
export interface DetailsSnapshot {
  bride: string;
  groom: string;
  nameOrder?: NameOrder | undefined;
  weddingDate: string | null;
  ceremonyTime?: string | null | undefined;
  venueName?: string | null | undefined;
  venueCity?: string | null | undefined;
  venueMapsUrl?: string | null | undefined;
}

function line(label: string, from: string | null | undefined, to: string | null | undefined) {
  const before = from ?? null;
  const after = to ?? null;
  if (before === after) return null;
  return {
    label,
    from: before === null ? null : before.slice(0, VALUE_MAX),
    to: after === null ? null : after.slice(0, VALUE_MAX),
  };
}

function compact(lines: readonly (InviteChangeLine | null)[]): InviteChangeLine[] {
  return lines.filter((entry): entry is InviteChangeLine => entry !== null);
}

/** The details form: names, name order, date, time and venue. */
export function detailsChanges(
  before: DetailsSnapshot,
  after: Partial<DetailsSnapshot>,
): InviteChangeLine[] {
  const order = (value: NameOrder | undefined) =>
    value === undefined ? NAME_ORDER_LABELS['bride-first'] : NAME_ORDER_LABELS[value];
  return compact([
    'bride' in after ? line('Bride’s name', before.bride, after.bride) : null,
    'groom' in after ? line('Groom’s name', before.groom, after.groom) : null,
    // A form with no name order keeps the saved one.
    after.nameOrder !== undefined
      ? line('Name order', order(before.nameOrder), order(after.nameOrder))
      : null,
    'weddingDate' in after ? line('Wedding date', before.weddingDate, after.weddingDate) : null,
    'ceremonyTime' in after ? line('Wedding time', before.ceremonyTime, after.ceremonyTime) : null,
    'venueName' in after ? line('Venue', before.venueName, after.venueName) : null,
    'venueCity' in after ? line('Venue city', before.venueCity, after.venueCity) : null,
    'venueMapsUrl' in after
      ? line('Venue map link', before.venueMapsUrl, after.venueMapsUrl)
      : null,
  ]);
}

/** The functions list: one ticked or unticked, and each detail of one kept. */
export function functionsChanges(
  before: readonly WeddingFunction[],
  after: readonly WeddingFunction[],
): InviteChangeLine[] {
  const lines: (InviteChangeLine | null)[] = [];
  const old = new Map(before.map((entry) => [entry.kind, entry]));
  const now = new Map(after.map((entry) => [entry.kind, entry]));
  for (const [kind, label] of Object.entries(FESTIVITY_LABELS)) {
    const was = old.get(kind as WeddingFunction['kind']);
    const is = now.get(kind as WeddingFunction['kind']);
    if (was === undefined && is === undefined) continue;
    if (was === undefined) {
      lines.push({ label: 'Function added', from: null, to: label.name });
    } else if (is === undefined) {
      lines.push({ label: 'Function removed', from: null, to: label.name });
    }
    lines.push(
      line(`${label.name} date`, was?.date, is?.date),
      line(`${label.name} time`, was?.time, is?.time),
      line(`${label.name} venue`, was?.venue, is?.venue),
      line(`${label.name} map link`, was?.mapsUrl, is?.mapsUrl),
    );
  }
  return compact(lines);
}

/** The families: each name and the card title, on both sides. */
export function familiesChanges(
  before: WeddingFamilies | undefined,
  after: WeddingFamilies,
): InviteChangeLine[] {
  const lines: (InviteChangeLine | null)[] = [];
  for (const side of FAMILY_SIDES) {
    const was = before?.[side];
    const is = after[side];
    const sideLabel = FAMILY_SIDE_LABELS[side].family;
    for (const field of FAMILY_FIELDS) {
      // The first release stored a bare surname; it shows as the title.
      const old = field === 'title' ? (was?.title ?? was?.surname) : was?.[field];
      const now = field === 'title' ? (is.title ?? is.surname) : is[field];
      lines.push(line(`${sideLabel}: ${FAMILY_FIELD_LABELS[field]}`, old, now));
    }
    const hidden = (noTitle: boolean | undefined) => (noTitle === true ? 'No title' : 'Shown');
    if ((was?.noTitle === true) !== (is.noTitle === true)) {
      lines.push(line(`${sideLabel}: Title`, hidden(was?.noTitle), hidden(is.noTitle)));
    }
  }
  return compact(lines);
}

/** The song guests can play. */
export function songChanges(before: string | null, after: string): InviteChangeLine[] {
  return compact([line('Song', before, after)]);
}

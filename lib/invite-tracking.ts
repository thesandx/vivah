import { z } from 'zod';

import { DEVICES } from '@/lib/visit-tracking';

/**
 * Live invite measurement: the names and the checks the browser and the
 * server share (ADR-0020). Pure, so a test needs no browser.
 *
 * A guest's browser sends one small report (a "beacon") when the invite
 * loads, one when the guest taps to open it, and one when they tap RSVP. A
 * beacon holds the wedding's id, a random id for the tab, the guest link's id
 * when the guest came through one, fixed ids and a flag for "first time in
 * this browser". It never holds a name, a phone number, an IP address or free
 * text, and no cookie is set for it.
 */

/** Where the browser posts a beacon. Same origin as the invite: `proxy.ts` leaves `/api/` alone. */
export const INVITE_BEACON_PATH = '/api/invite-visits';

/** What a guest did. */
export const INVITE_EVENTS = [
  { id: 'opened', label: 'Opened the link' },
  { id: 'envelope-opened', label: 'Tapped to open the invite' },
  { id: 'rsvp-tapped', label: 'Tapped RSVP' },
] as const;

export type InviteEventId = (typeof INVITE_EVENTS)[number]['id'];

/**
 * Who is looking. `couple` is a browser that opened the invite from the
 * couple's own dashboard at least once. Everyone else is a `guest`. The
 * admin's browser is never stored.
 */
export const INVITE_VIEWERS = ['guest', 'couple'] as const;

export type InviteViewer = (typeof INVITE_VIEWERS)[number];

/** The attribute on the RSVP button whose tap is an event. */
export const INVITE_EVENT_ATTRIBUTE = 'data-invite-event';

/**
 * The marks a link from our own pages adds to the invite address. The page
 * removes the mark at once, so a copied address never carries it.
 *
 * - `#from-admin`: the admin's browser is never counted on this invite again.
 * - `#from-dashboard`: the couple's browser counts as `couple` from now on.
 */
export const FROM_ADMIN_MARK = 'from-admin';
export const FROM_DASHBOARD_MARK = 'from-dashboard';

/** Adds a mark to an invite address. */
export function withInviteMark(href: string, mark: string): string {
  return `${href.split('#')[0] ?? href}#${mark}`;
}

/** The browser's note for one invite, in `localStorage`: one fixed word, never a name. */
export const INVITE_SEEN_KEY_PREFIX = 'vivah-invite-seen:';

export const INVITE_SEEN_VALUES = ['guest', 'couple', 'admin'] as const;

export type InviteSeen = (typeof INVITE_SEEN_VALUES)[number];

export function isInviteSeen(value: string | null): value is InviteSeen {
  return value !== null && (INVITE_SEEN_VALUES as readonly string[]).includes(value);
}

/**
 * What this browser is from now on, from what it was before and the mark on
 * the address. Admin wins and stays. A dashboard mark makes a guest browser
 * the couple's.
 */
export function nextSeen(before: InviteSeen | null, mark: string): InviteSeen {
  if (before === 'admin' || mark === FROM_ADMIN_MARK) return 'admin';
  if (before === 'couple' || mark === FROM_DASHBOARD_MARK) return 'couple';
  return 'guest';
}

/** A Firestore auto id: the wedding. */
export const weddingIdSchema = z.string().regex(/^[A-Za-z0-9]{20}$/);

/** A guest link id: the SHA-256 of its key, in hex (`services/guest-link.service.ts`). */
export const guestLinkIdSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** One beacon. Strict, so an unknown key fails. */
export const inviteBeaconSchema = z
  .object({
    weddingId: weddingIdSchema,
    /** A random id for this tab, from `crypto.randomUUID()`. Not tied to a person. */
    viewId: z.uuid(),
    event: z.enum(INVITE_EVENTS.map((event) => event.id) as [InviteEventId, ...InviteEventId[]]),
    device: z.enum(DEVICES),
    viewer: z.enum(INVITE_VIEWERS),
    /** True when this browser had not opened this invite before. */
    firstVisit: z.boolean(),
    /** The guest link the guest came through, when there was one. */
    guestLinkId: guestLinkIdSchema.optional(),
  })
  .strict();

export type InviteBeacon = z.infer<typeof inviteBeaconSchema>;

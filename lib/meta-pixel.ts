/**
 * Meta Pixel measurement: the names and the event shapes. Pure, so a test
 * needs no browser. ADR-0017 records the decision.
 */

import type { ConversionKind } from '@/lib/google-ads';

/** Meta's Pixel library. */
export const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

/** Prefix of the `sessionStorage` key that stops a Meta event counting twice in one tab. */
export const META_EVENT_SENT_PREFIX = 'vivah_meta_sent:';

/** What a Meta event carries beyond its kind. */
export interface MetaEventDetails {
  /** In rupees. Sent with the currency `INR`. */
  value?: number;
  /** The payment's id. Sent as Meta's `eventID`. */
  eventId?: string;
}

/** The arguments of one `fbq('track', …)` call, after `'track'`. */
export type MetaTrackCall =
  | [name: 'Lead']
  | [name: 'Purchase', params: { value: number; currency: 'INR' }, options?: { eventID: string }];

/**
 * The standard Meta event for one of our conversions: a preview made is a
 * `Lead`, a payment is a `Purchase`. `null` when a purchase has no amount,
 * because Meta refuses a `Purchase` without a value.
 *
 * Only these fields are sent. Never a name, a phone number or an email: Meta
 * gets the event, not the person (ADR-0017).
 */
export function metaTrackCall(
  kind: ConversionKind,
  details: MetaEventDetails = {},
): MetaTrackCall | null {
  if (kind === 'signup') return ['Lead'];
  const { value, eventId } = details;
  if (value === undefined || !Number.isFinite(value) || value < 0) return null;
  return eventId === undefined
    ? ['Purchase', { value, currency: 'INR' }]
    : ['Purchase', { value, currency: 'INR' }, { eventID: eventId }];
}

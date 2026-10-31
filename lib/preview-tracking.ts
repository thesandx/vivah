import { z } from 'zod';

import { DEVICES } from '@/lib/visit-tracking';

/**
 * Preview page measurement: the names and the checks the browser and the
 * server share. Pure, so a test needs no browser. ADR-0019 records the
 * decision.
 *
 * The preview page sends a small report (a "beacon") when the tab is hidden
 * or left, and at once on a step of payment. It holds the preview's id, a
 * random id for the tab, fixed ids from the lists below, and milliseconds.
 * It never holds a name, a phone number, an IP address or free text, and no
 * cookie is set for it.
 */

/** Where the browser posts a beacon. */
export const PREVIEW_BEACON_PATH = '/api/preview-visits';

/** The attribute that marks an invite section for the time count. */
export const PREVIEW_SECTION_ATTRIBUTE = 'data-preview-section';

/** The attribute that marks a button or link whose tap is an event. */
export const PREVIEW_EVENT_ATTRIBUTE = 'data-preview-event';

/** The `window` event a component dispatches to record a preview event. */
export const PREVIEW_EVENT_NAME = 'vivah:preview-event';

/**
 * The invite's sections, top to bottom. The order is the scroll funnel in
 * `/admin`: a viewer who reached a section reached the ones above it.
 */
export const PREVIEW_SECTIONS = [
  { id: 'names', label: 'Ganesh ji and names' },
  { id: 'save-date', label: 'Save the date (scratch)' },
  { id: 'wedding', label: 'Wedding day and countdown' },
  { id: 'venue', label: 'Venue' },
  { id: 'families', label: 'Our families' },
  { id: 'functions', label: 'Functions' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'closing', label: 'Closing and pay sheet' },
] as const;

export type PreviewSectionId = (typeof PREVIEW_SECTIONS)[number]['id'];

/**
 * What a viewer did, in the order a couple usually does it. `opened` is the
 * page loading; the payment events come from the pay sheet and Razorpay's
 * window.
 */
export const PREVIEW_EVENTS = [
  { id: 'opened', label: 'Opened the preview' },
  { id: 'gate-opened', label: 'Tapped open the invite' },
  { id: 'scratched', label: 'Scratched the date' },
  { id: 'sheet-opened', label: 'Opened the pay sheet' },
  { id: 'coupon-applied', label: 'Applied a coupon' },
  { id: 'coupon-refused', label: 'Tried a coupon that did not work' },
  { id: 'chat-tapped', label: 'Tapped WhatsApp chat on the pay sheet' },
  { id: 'family-share-tapped', label: 'Tapped Share with family' },
  { id: 'pay-tapped', label: 'Tapped pay' },
  { id: 'checkout-opened', label: 'Payment window opened' },
  { id: 'checkout-closed', label: 'Closed the payment window' },
  { id: 'payment-failed', label: 'Payment failed' },
  { id: 'paid', label: 'Paid' },
  { id: 'closed-seen', label: 'Saw "preview has closed"' },
  { id: 'closed-whatsapp', label: 'Tapped WhatsApp to reopen' },
] as const;

export type PreviewEventId = (typeof PREVIEW_EVENTS)[number]['id'];

/**
 * Who is looking. `couple` is a browser the preview is bound to (the sign-up
 * screen or the WhatsApp link). `other` is anyone else with the link, usually
 * family the couple shared it with.
 */
export const PREVIEW_VIEWERS = ['couple', 'other'] as const;

export type PreviewViewer = (typeof PREVIEW_VIEWERS)[number];

/** A section's time in one beacon is capped, so a tab left open all night does not count. */
export const MAX_PREVIEW_SECTION_MS = 30 * 60_000;

const sectionIds = PREVIEW_SECTIONS.map((section) => section.id) as [
  PreviewSectionId,
  ...PreviewSectionId[],
];
const eventIds = PREVIEW_EVENTS.map((event) => event.id) as [PreviewEventId, ...PreviewEventId[]];

const SECTION_IDS = new Set<string>(sectionIds);
const EVENT_IDS = new Set<string>(eventIds);

export function isPreviewSectionId(value: string | null | undefined): value is PreviewSectionId {
  return value !== null && value !== undefined && SECTION_IDS.has(value);
}

export function isPreviewEventId(value: string | null | undefined): value is PreviewEventId {
  return value !== null && value !== undefined && EVENT_IDS.has(value);
}

/** A Firestore auto id: the preview's lead. */
export const leadIdSchema = z.string().regex(/^[A-Za-z0-9]{20}$/);

/**
 * One beacon. Strict, so an unknown key fails, and every value is a fixed id
 * or a bounded number.
 */
export const previewBeaconSchema = z
  .object({
    leadId: leadIdSchema,
    /** A random id for this tab, from `crypto.randomUUID()`. Not tied to a person. */
    viewId: z.uuid(),
    /** 0 for the first beacon of the tab. */
    seq: z.number().int().min(0).max(500),
    device: z.enum(DEVICES),
    viewer: z.enum(PREVIEW_VIEWERS),
    /** Milliseconds each section held the middle of the screen since the last beacon. */
    sectionMs: z.partialRecord(
      z.enum(sectionIds),
      z.number().int().min(0).max(MAX_PREVIEW_SECTION_MS),
    ),
    /** What happened since the last beacon, in order. */
    events: z.array(z.enum(eventIds)).max(50),
  })
  .strict();

export type PreviewBeacon = z.infer<typeof previewBeaconSchema>;

/** The beacons that must go at once, because the page may be about to leave. */
export const URGENT_PREVIEW_EVENTS: ReadonlySet<PreviewEventId> = new Set<PreviewEventId>([
  'pay-tapped',
  'checkout-opened',
  'checkout-closed',
  'payment-failed',
  'paid',
  'chat-tapped',
  'family-share-tapped',
  'closed-whatsapp',
]);

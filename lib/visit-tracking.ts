import { z } from 'zod';

/**
 * Home page visit measurement: the names and the checks the browser and the
 * server share. Pure, so a test needs no browser. ADR-0014 records the
 * decision.
 *
 * The browser sends a small report (a "beacon") when the visitor leaves the
 * page or hides the tab. It holds only fixed ids from the lists below, seconds
 * and counts. It never holds a name, a phone number, an IP address or free
 * text, and no cookie is set.
 */

/** Where the browser posts a beacon. */
export const VISIT_BEACON_PATH = '/api/visits';

/** The `sessionStorage` key of this tab's visit id. It dies with the tab. */
export const VISIT_ID_STORAGE_KEY = 'vivah_visit';

/** The attribute that marks a home section for the time count. */
export const SECTION_ATTRIBUTE = 'data-track-section';

/** The attribute that marks a button or link for the click count. */
export const CTA_ATTRIBUTE = 'data-track-cta';

/**
 * The home page sections, top to bottom. The order is the scroll funnel in
 * `/admin`: a visitor who reached a section reached the ones above it.
 */
export const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero and sign-up card' },
  { id: 'try', label: 'Try it here (live invite)' },
  { id: 'guests', label: 'What your guests see' },
  { id: 'how', label: 'How it works' },
  { id: 'features', label: 'Everything included' },
  { id: 'compare', label: 'Paper or digital' },
  { id: 'reviews', label: 'Couple reviews' },
  { id: 'chats', label: 'WhatsApp chats' },
  { id: 'final', label: 'Last call to action' },
  { id: 'guides', label: 'Help and guides' },
] as const;

export type SectionId = (typeof HOME_SECTIONS)[number]['id'];

/**
 * Every button and link the home page counts. `signup` marks the ones that
 * open the sign-up card, so a preview can be credited to the last one tapped.
 */
export const HOME_CTAS = [
  { id: 'hero-card', label: 'Hero sign-up card', signup: true },
  { id: 'try-cta', label: '“Make one for us” (after Try it here)', signup: true },
  { id: 'guests-cta', label: '“Write our love story” (after guests see)', signup: true },
  { id: 'how-cta', label: '“Begin our forever” (after How it works)', signup: true },
  { id: 'features-cta', label: '“Give our wedding a home” (after features)', signup: true },
  { id: 'compare-cta', label: '“Make our invite timeless” (after paper or digital)', signup: true },
  { id: 'reviews-cta', label: 'After couple reviews', signup: true },
  { id: 'chats-cta', label: 'After WhatsApp chats', signup: true },
  { id: 'final-cta', label: '“Show us our wedding website” (last section)', signup: true },
  { id: 'sticky-bar', label: 'Sticky bar at the bottom', signup: true },
  { id: 'demo-video', label: 'Watch the demo video', signup: false },
  { id: 'final-sample', label: '“See a real invite”', signup: false },
  { id: 'final-whatsapp', label: '“Ask us on WhatsApp” (last section)', signup: false },
  { id: 'whatsapp-float', label: 'Floating WhatsApp button', signup: false },
  { id: 'offer-ribbon', label: 'Coupon ribbon at the top', signup: false },
] as const;

export type CtaId = (typeof HOME_CTAS)[number]['id'];

/** The CTAs that open the sign-up card. */
export function isSignupCta(id: CtaId): boolean {
  return HOME_CTAS.some((cta) => cta.id === id && cta.signup);
}

/**
 * The sign-up card's steps, in order. `started` is the first tap into the
 * card; `made` is a preview the server created.
 */
export const SIGNUP_STEPS = [
  { id: 'started', label: 'Started the card' },
  { id: 'details', label: 'Step 2: date and WhatsApp' },
  { id: 'functions', label: 'Step 3: functions' },
  { id: 'address', label: 'Step 4: site address' },
  { id: 'song', label: 'Step 5: song' },
  { id: 'made', label: 'Preview made' },
] as const;

export type SignupStepId = (typeof SIGNUP_STEPS)[number]['id'];

/** Where a visit came from, in a few buckets. */
export const VISIT_SOURCES = [
  'google-ads',
  'google',
  'instagram',
  'facebook',
  'whatsapp',
  'other-site',
  'direct',
] as const;

export type VisitSource = (typeof VISIT_SOURCES)[number];

export const DEVICES = ['phone', 'tablet', 'desktop'] as const;

export type Device = (typeof DEVICES)[number];

/** A section's time in one beacon is capped, so a tab left open all night does not count. */
export const MAX_SECTION_MS = 30 * 60_000;

const sectionIds = HOME_SECTIONS.map((section) => section.id) as [SectionId, ...SectionId[]];
const ctaIds = HOME_CTAS.map((cta) => cta.id) as [CtaId, ...CtaId[]];
const stepIds = SIGNUP_STEPS.map((step) => step.id) as [SignupStepId, ...SignupStepId[]];

/** A Firestore auto id: the lead the card created. */
const leadIdSchema = z.string().regex(/^[A-Za-z0-9]{20}$/);

/** A campaign or ad name from a `utm_*` parameter: short, and plain characters only. */
const campaignSchema = z
  .string()
  .max(60)
  .regex(/^[A-Za-z0-9 _.+-]*$/);

/**
 * One beacon. Strict, so an unknown key fails, and every value is a fixed id
 * or a bounded number. The first beacon of a visit (`seq` 0) says where the
 * visit came from; later ones add time and taps.
 */
export const visitBeaconSchema = z
  .object({
    /** A random id for this tab, from `crypto.randomUUID()`. Not tied to a person. */
    visitId: z.uuid(),
    /** 0 for the first beacon of the visit. */
    seq: z.number().int().min(0).max(500),
    device: z.enum(DEVICES),
    source: z.enum(VISIT_SOURCES).optional(),
    campaign: campaignSchema.optional(),
    /** Milliseconds each section held the middle of the screen since the last beacon. */
    sectionMs: z.partialRecord(z.enum(sectionIds), z.number().int().min(0).max(MAX_SECTION_MS)),
    /** The CTAs tapped since the last beacon, in order. */
    clicks: z.array(z.enum(ctaIds)).max(50),
    /** The sign-up steps reached since the last beacon. */
    steps: z.array(z.enum(stepIds)).max(SIGNUP_STEPS.length),
    /** Set when the card created a preview: the lead, and the CTA that opened the card. */
    lead: z
      .object({ id: leadIdSchema, cta: z.enum(ctaIds) })
      .strict()
      .optional(),
  })
  .strict();

export type VisitBeacon = z.infer<typeof visitBeaconSchema>;

/** Hosts whose referral counts as one of the named sources. */
const REFERRER_SOURCES: readonly [RegExp, VisitSource][] = [
  [/(^|\.)google\./, 'google'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
];

const UTM_SOURCES: readonly [RegExp, VisitSource][] = [
  [/^(ig|instagram)/i, 'instagram'],
  [/^(fb|facebook|meta)/i, 'facebook'],
  [/^(wa|whatsapp)/i, 'whatsapp'],
  [/^google/i, 'google-ads'],
];

/**
 * Where a visit came from, from the landing URL and `document.referrer`. A
 * `gclid` means a Google ad. A `utm_source` wins over the referrer, because
 * Instagram and WhatsApp often send no referrer at all. A referrer on our own
 * domain is a visitor coming back to the home page: direct.
 */
export function classifySource(search: string, referrer: string, ownHost: string): VisitSource {
  const params = new URLSearchParams(search);
  if (params.has('gclid') || params.has('gbraid') || params.has('wbraid')) return 'google-ads';
  const utm = params.get('utm_source');
  if (utm !== null && utm !== '') {
    return UTM_SOURCES.find(([pattern]) => pattern.test(utm))?.[1] ?? 'other-site';
  }
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  const own = ownHost.toLowerCase().replace(/^www\./, '');
  if (host === own || host.endsWith(`.${own}`)) return 'direct';
  return REFERRER_SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? 'other-site';
}

/**
 * The campaign of an ad link: `utm_campaign`, else `utm_content` (the ad
 * name, A01–A12 in the Meta plan). `undefined` when absent or not plain text.
 */
export function campaignFrom(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const raw = params.get('utm_campaign') ?? params.get('utm_content');
  if (raw === null) return undefined;
  const parsed = campaignSchema.safeParse(raw.trim().slice(0, 60));
  return parsed.success && parsed.data !== '' ? parsed.data : undefined;
}

/** The device class by screen width, at the design breakpoints (`md`, `lg`). */
export function deviceFor(width: number): Device {
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

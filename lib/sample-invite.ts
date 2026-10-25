/**
 * The sample invite: a made-up couple's site at `priya-rahul.vivah.online`,
 * which the home page links to as "See a real invite". Pure, so it is tested
 * without Firestore.
 *
 * The sample is not a wedding document. It is built here, in code, so it
 * never counts as a sale, never appears in `/admin`, and never sends an
 * alert. No couple can claim its address: `slugProblem` refuses it and the
 * address suggestions skip it. If a real wedding already holds the address,
 * the real wedding wins and the sample does not show.
 *
 * The couple, the day and the venue match the demo video: Priya and Rahul,
 * 7 December, at a Delhi venue. The venue is invented. The RSVP section
 * uses our business WhatsApp number, never a couple's, and its button sends
 * `SAMPLE_RSVP_MESSAGE`: a visitor who taps it is asking us for a site.
 *
 * The sample has every function (tilak to reception) over four days round
 * the wedding, so a visitor sees the "Wedding Festivities" timeline full.
 *
 * The admin changes the venue names, addresses and map links from `/admin`
 * (Home page tab), without a deploy. They live in `siteContent/sample-invite`
 * (`services/sample-invite.service.ts`). `DEFAULT_SAMPLE_VENUES` is what
 * shows before the first save, and when that read fails. The names, the
 * dates and the times stay here, in code.
 */

import { z } from 'zod';

import { isGoogleMapsUrl } from '@/lib/invite-contact';
import { FUNCTION_KINDS, type FunctionKind, type WeddingFunction } from '@/lib/wedding-functions';

/** The sample's address: `priya-rahul.vivah.online`. */
export const SAMPLE_SLUG = 'priya-rahul';

/**
 * The sample's earlier addresses. `proxy.ts` sends a visitor on one of them
 * to `SAMPLE_SLUG`, so a link shared before the move still opens the sample,
 * and no couple can take one.
 */
export const OLD_SAMPLE_SLUGS: readonly string[] = ['riya-arjun'];

/**
 * The guest the home page's link greets: `priya-rahul.vivah.online/Neha`.
 * A visitor sees what a guest sees, with a name on the card.
 */
export const SAMPLE_GUEST = 'Neha';

/** What the sample's RSVP button sends to our business WhatsApp (Sandeep's wording). */
export const SAMPLE_RSVP_MESSAGE =
  'Hi Team Vivah, i want to create same website for my wedding as well';

/** The sample's wedding day is the next 7 December at least this many days away. */
const MIN_DAYS_AHEAD = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SampleWedding {
  bride: string;
  groom: string;
  /** `YYYY-MM-DD`. */
  weddingDate: string;
  /** `HH:MM`, 24-hour, India Standard Time. */
  ceremonyTime: string;
  venueName: string;
  venueCity: string;
  venueMapsUrl: string;
  /** Every function, dated round the wedding day. */
  functions: WeddingFunction[];
}

/**
 * The sample's wedding day: 7 December, as in the demo video. It moves to
 * the next year a month before the day, so a visitor always sees the
 * countdown and the date, never the "married couple" message that follows
 * a wedding.
 */
export function sampleWeddingDate(now: Date): string {
  for (let year = now.getUTCFullYear(); ; year += 1) {
    const day = Date.UTC(year, 11, 7);
    if (day - now.getTime() >= MIN_DAYS_AHEAD * DAY_MS) return `${year}-12-07`;
  }
}

/** `isoDate` moved by `days`: `addDays('2026-12-07', -2)` is `2026-12-05`. */
function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const VENUE_MAPS_URL = 'https://www.google.com/maps/place/Chhatarpur,+New+Delhi';

/** The fixed id of the document that holds the admin's venues. */
export const SAMPLE_VENUES_DOC_ID = 'sample-invite';

const mapsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isGoogleMapsUrl, 'Paste a Google Maps link that starts with https://.');

const functionVenueSchema = z.object({
  /** The place, in one line, as the function's card prints it. */
  venue: z.string().trim().min(1, 'Add the venue.').max(100),
  mapsUrl: mapsUrlSchema,
});

/** The venues the sample shows: the wedding's, and one per function. */
export const sampleVenuesSchema = z.object({
  venueName: z.string().trim().min(1, 'Add the venue name.').max(80),
  /** The address line under the venue name: town and state. */
  venueCity: z.string().trim().min(1, 'Add the address.').max(80),
  venueMapsUrl: mapsUrlSchema,
  functions: z.object({
    tilak: functionVenueSchema,
    haldi: functionVenueSchema,
    mehndi: functionVenueSchema,
    sangeet: functionVenueSchema,
    reception: functionVenueSchema,
  }),
});

export type SampleVenues = z.infer<typeof sampleVenuesSchema>;

/** The venues before the admin changes them: one invented Delhi venue. */
export const DEFAULT_SAMPLE_VENUES: SampleVenues = {
  venueName: 'The Grand Pavilion, Chhatarpur',
  venueCity: 'New Delhi, Delhi',
  venueMapsUrl: VENUE_MAPS_URL,
  functions: {
    tilak: {
      venue: 'Residence, Vasant Kunj',
      mapsUrl: 'https://www.google.com/maps/place/Vasant+Kunj,+New+Delhi',
    },
    haldi: { venue: 'Grand Pavilion Lawns', mapsUrl: VENUE_MAPS_URL },
    mehndi: { venue: 'Grand Pavilion Courtyard', mapsUrl: VENUE_MAPS_URL },
    sangeet: { venue: 'Grand Pavilion Banquet', mapsUrl: VENUE_MAPS_URL },
    reception: { venue: 'Grand Pavilion Lawns', mapsUrl: VENUE_MAPS_URL },
  },
};

/** The form field names for one function's venue and map link, such as `haldi-venue`. */
export function functionVenueField(kind: FunctionKind, part: 'venue' | 'mapsUrl'): string {
  return `${kind}-${part}`;
}

export type SampleVenuesParse = { ok: true; venues: SampleVenues } | { ok: false; message: string };

/** Reads the admin's venue form. The first problem comes back in words. */
export function parseSampleVenuesForm(form: FormData): SampleVenuesParse {
  const text = (key: string): string => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };
  const functions = Object.fromEntries(
    FUNCTION_KINDS.map((kind) => [
      kind,
      {
        venue: text(functionVenueField(kind, 'venue')),
        mapsUrl: text(functionVenueField(kind, 'mapsUrl')),
      },
    ]),
  );
  const parsed = sampleVenuesSchema.safeParse({
    venueName: text('venueName'),
    venueCity: text('venueCity'),
    venueMapsUrl: text('venueMapsUrl'),
    functions,
  });
  if (parsed.success) return { ok: true, venues: parsed.data };
  const issue = parsed.error.issues[0];
  const [first, kind] = issue?.path ?? [];
  const where =
    first === 'functions' && typeof kind === 'string'
      ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}: `
      : first === 'venueMapsUrl'
        ? 'Wedding map link: '
        : '';
  return { ok: false, message: `${where}${issue?.message ?? 'Check the venues.'}` };
}

/** When each function happens, in days from the wedding day and `HH:MM`. */
const FUNCTION_TIMES: Record<FunctionKind, { day: number; time: string }> = {
  tilak: { day: -2, time: '11:00' },
  haldi: { day: -1, time: '10:00' },
  mehndi: { day: -1, time: '15:30' },
  sangeet: { day: -1, time: '19:30' },
  reception: { day: 1, time: '20:30' },
};

/**
 * The sample couple and their day, for the invite and its link preview.
 * `venues` are the admin's, or the defaults.
 */
export function sampleWedding(
  now: Date,
  venues: SampleVenues = DEFAULT_SAMPLE_VENUES,
): SampleWedding {
  const weddingDate = sampleWeddingDate(now);
  return {
    bride: 'Priya',
    groom: 'Rahul',
    weddingDate,
    ceremonyTime: '19:00',
    venueName: venues.venueName,
    venueCity: venues.venueCity,
    venueMapsUrl: venues.venueMapsUrl,
    functions: FUNCTION_KINDS.map((kind) => ({
      kind,
      date: addDays(weddingDate, FUNCTION_TIMES[kind].day),
      time: FUNCTION_TIMES[kind].time,
      venue: venues.functions[kind].venue,
      mapsUrl: venues.functions[kind].mapsUrl,
    })),
  };
}

/** True when `slug` is the sample's address. */
export function isSampleSlug(slug: string): boolean {
  return slug === SAMPLE_SLUG;
}

/** True when `slug` is one of the sample's earlier addresses. */
export function isOldSampleSlug(slug: string): boolean {
  return OLD_SAMPLE_SLUGS.includes(slug);
}

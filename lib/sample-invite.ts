/**
 * The sample invite: a made-up couple's site at `riya-arjun.vivah.online`,
 * which the home page links to as "See a real invite". Pure, so it is tested
 * without Firestore.
 *
 * The sample is not a wedding document. It is built here, in code, so it
 * never counts as a sale, never appears in `/admin`, and never sends an
 * alert. No couple can claim its address: `slugProblem` refuses it and the
 * address suggestions skip it. If a real wedding already holds the address,
 * the real wedding wins and the sample does not show.
 *
 * The couple, the day and the venue match the demo video: Riya and Arjun,
 * 7 December, at a Delhi venue. The venue is invented. The sample has no
 * phone number, so the RSVP section does not show: a real person's number
 * must never appear on it.
 *
 * The sample has every function (tilak to reception) over four days round
 * the wedding, so a visitor sees the "Wedding Festivities" timeline full.
 */

import type { WeddingFunction } from '@/lib/wedding-functions';

/** The sample's address: `riya-arjun.vivah.online`. */
export const SAMPLE_SLUG = 'riya-arjun';

/**
 * The guest the home page's link greets: `riya-arjun.vivah.online/Kartheek`.
 * A visitor sees what a guest sees, with a name on the card.
 */
export const SAMPLE_GUEST = 'Kartheek';

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

/** The sample couple and their day, for the invite and its link preview. */
export function sampleWedding(now: Date): SampleWedding {
  const weddingDate = sampleWeddingDate(now);
  const on = (days: number) => addDays(weddingDate, days);
  return {
    bride: 'Riya',
    groom: 'Arjun',
    weddingDate,
    ceremonyTime: '19:00',
    venueName: 'The Grand Pavilion, Chhatarpur',
    venueCity: 'New Delhi, Delhi',
    venueMapsUrl: VENUE_MAPS_URL,
    functions: [
      {
        kind: 'tilak',
        date: on(-2),
        time: '11:00',
        venue: 'Residence, Vasant Kunj',
        mapsUrl: 'https://www.google.com/maps/place/Vasant+Kunj,+New+Delhi',
      },
      {
        kind: 'haldi',
        date: on(-1),
        time: '10:00',
        venue: 'Grand Pavilion Lawns',
        mapsUrl: VENUE_MAPS_URL,
      },
      {
        kind: 'mehndi',
        date: on(-1),
        time: '15:30',
        venue: 'Grand Pavilion Courtyard',
        mapsUrl: VENUE_MAPS_URL,
      },
      {
        kind: 'sangeet',
        date: on(-1),
        time: '19:30',
        venue: 'Grand Pavilion Banquet',
        mapsUrl: VENUE_MAPS_URL,
      },
      {
        kind: 'reception',
        date: on(1),
        time: '20:30',
        venue: 'Grand Pavilion Lawns',
        mapsUrl: VENUE_MAPS_URL,
      },
    ],
  };
}

/** True when `slug` is the sample's address. */
export function isSampleSlug(slug: string): boolean {
  return slug === SAMPLE_SLUG;
}

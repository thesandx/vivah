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
 */

/** The sample's address: `riya-arjun.vivah.online`. */
export const SAMPLE_SLUG = 'riya-arjun';

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

/** The sample couple and their day, for the invite and its link preview. */
export function sampleWedding(now: Date): SampleWedding {
  return {
    bride: 'Riya',
    groom: 'Arjun',
    weddingDate: sampleWeddingDate(now),
    ceremonyTime: '19:00',
    venueName: 'The Grand Pavilion, Chhatarpur',
    venueCity: 'New Delhi, Delhi',
    venueMapsUrl: 'https://www.google.com/maps/place/Chhatarpur,+New+Delhi',
  };
}

/** True when `slug` is the sample's address. */
export function isSampleSlug(slug: string): boolean {
  return slug === SAMPLE_SLUG;
}

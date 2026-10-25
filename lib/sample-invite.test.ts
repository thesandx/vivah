import { describe, expect, it } from 'vitest';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import {
  DEFAULT_SAMPLE_VENUES,
  functionVenueField,
  isOldSampleSlug,
  isSampleSlug,
  parseSampleVenuesForm,
  SAMPLE_SLUG,
  sampleVenuesSchema,
  sampleWedding,
  sampleWeddingDate,
} from '@/lib/sample-invite';
import { FUNCTION_KINDS, weddingFunctionsSchema } from '@/lib/wedding-functions';

describe('sampleWeddingDate', () => {
  it('is 7 December this year while it is a month or more away', () => {
    expect(sampleWeddingDate(new Date('2026-10-18T10:00:00Z'))).toBe('2026-12-07');
    expect(sampleWeddingDate(new Date('2026-11-07T00:00:00Z'))).toBe('2026-12-07');
  });

  it('moves to next year inside the last month, and after the day', () => {
    expect(sampleWeddingDate(new Date('2026-11-08T00:00:00Z'))).toBe('2027-12-07');
    expect(sampleWeddingDate(new Date('2026-12-25T00:00:00Z'))).toBe('2027-12-07');
  });
});

describe('sampleWedding', () => {
  it('is Priya and Rahul at a Delhi venue', () => {
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'));
    expect(wedding).toMatchObject({
      bride: 'Priya',
      groom: 'Rahul',
      venueCity: 'New Delhi, Delhi',
    });
  });

  it('has every function, dated round the wedding day', () => {
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'));
    expect(weddingFunctionsSchema.safeParse(wedding.functions).success).toBe(true);
    expect(wedding.functions.map((entry) => [entry.kind, entry.date])).toEqual([
      ['tilak', '2026-12-05'],
      ['haldi', '2026-12-06'],
      ['mehndi', '2026-12-06'],
      ['sangeet', '2026-12-06'],
      ['reception', '2026-12-08'],
    ]);
  });
});

describe('the sample venues', () => {
  const MAPS = 'https://maps.app.goo.gl/abc123';

  /** The admin's form, filled with the defaults, then `changes`. */
  function form(changes: Record<string, string> = {}): FormData {
    const data = new FormData();
    data.set('venueName', DEFAULT_SAMPLE_VENUES.venueName);
    data.set('venueCity', DEFAULT_SAMPLE_VENUES.venueCity);
    data.set('venueMapsUrl', DEFAULT_SAMPLE_VENUES.venueMapsUrl);
    for (const kind of FUNCTION_KINDS) {
      data.set(functionVenueField(kind, 'venue'), DEFAULT_SAMPLE_VENUES.functions[kind].venue);
      data.set(functionVenueField(kind, 'mapsUrl'), DEFAULT_SAMPLE_VENUES.functions[kind].mapsUrl);
    }
    for (const [key, value] of Object.entries(changes)) data.set(key, value);
    return data;
  }

  it('the defaults are valid, and are what the sample shows before a save', () => {
    expect(sampleVenuesSchema.safeParse(DEFAULT_SAMPLE_VENUES).success).toBe(true);
    expect(sampleWedding(new Date('2026-10-18T00:00:00Z')).venueName).toBe(
      'The Grand Pavilion, Chhatarpur',
    );
  });

  it('puts the admin venues on the wedding and on each function', () => {
    const parsed = parseSampleVenuesForm(
      form({
        venueName: '  Taj Palace  ',
        venueCity: 'Chanakyapuri, New Delhi',
        venueMapsUrl: MAPS,
        'haldi-venue': 'Farmhouse, Sainik Farms',
        'haldi-mapsUrl': MAPS,
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const wedding = sampleWedding(new Date('2026-10-18T00:00:00Z'), parsed.venues);
    expect(wedding).toMatchObject({
      venueName: 'Taj Palace',
      venueCity: 'Chanakyapuri, New Delhi',
      venueMapsUrl: MAPS,
    });
    expect(wedding.functions.find((entry) => entry.kind === 'haldi')).toMatchObject({
      venue: 'Farmhouse, Sainik Farms',
      mapsUrl: MAPS,
      date: '2026-12-06',
      time: '10:00',
    });
    expect(wedding.functions.find((entry) => entry.kind === 'tilak')?.venue).toBe(
      'Residence, Vasant Kunj',
    );
  });

  it('refuses an empty venue, naming the function', () => {
    expect(parseSampleVenuesForm(form({ 'mehndi-venue': '  ' }))).toEqual({
      ok: false,
      message: 'Mehndi: Add the venue.',
    });
    expect(parseSampleVenuesForm(form({ venueName: '' }))).toEqual({
      ok: false,
      message: 'Add the venue name.',
    });
  });

  it('refuses a link that is not Google Maps', () => {
    const wedding = parseSampleVenuesForm(form({ venueMapsUrl: 'https://example.com/map' }));
    expect(wedding.ok).toBe(false);
    if (!wedding.ok) expect(wedding.message).toMatch(/^Wedding map link: /);
    const sangeet = parseSampleVenuesForm(form({ 'sangeet-mapsUrl': 'http://maps.google.com/x' }));
    expect(sangeet.ok).toBe(false);
    if (!sangeet.ok) expect(sangeet.message).toMatch(/^Sangeet: /);
  });
});

describe('the sample address', () => {
  it('is a valid host label, so the router serves it', () => {
    expect(isValidCoupleSlug(SAMPLE_SLUG)).toBe(true);
    expect(isSampleSlug('priya-rahul')).toBe(true);
    expect(isSampleSlug('priya-rahul-2')).toBe(false);
    expect(isSampleSlug('riya-arjun')).toBe(false);
    expect(isOldSampleSlug('riya-arjun')).toBe(true);
  });
});

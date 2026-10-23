import { describe, expect, it } from 'vitest';

import {
  cleanFunctionKinds,
  emptyFunction,
  type Festivity,
  festivityCards,
  formatFestivityDate,
  parseWeddingFunctions,
  sortFestivities,
  weddingFunctionsSchema,
} from '@/lib/wedding-functions';

const MAPS = 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86';

function card(kind: Festivity['kind'], date: string | null, time: string | null = null): Festivity {
  return { kind, date, time, venue: null, mapsUrl: null };
}

describe('cleanFunctionKinds', () => {
  it('keeps known kinds once each, in the usual order', () => {
    expect(cleanFunctionKinds(['reception', 'tilak', 'roka', 'tilak', 3])).toEqual([
      'tilak',
      'reception',
    ]);
  });
});

describe('weddingFunctionsSchema', () => {
  it('accepts a function with nothing added yet', () => {
    expect(weddingFunctionsSchema.safeParse([emptyFunction('haldi')]).success).toBe(true);
  });

  it('refuses the same function twice, and a link that is not Google Maps', () => {
    const haldi = emptyFunction('haldi');
    expect(weddingFunctionsSchema.safeParse([haldi, haldi]).success).toBe(false);
    expect(
      weddingFunctionsSchema.safeParse([{ ...haldi, mapsUrl: 'https://evil.example/maps' }])
        .success,
    ).toBe(false);
  });
});

describe('sortFestivities', () => {
  it('sorts by date, then by time', () => {
    const sorted = sortFestivities([
      card('reception', '2026-12-30', '20:30'),
      card('wedding', '2026-12-30', '19:14'),
      card('mehndi', '2026-12-29', '15:30'),
      card('haldi', '2026-12-29', '10:00'),
      card('tilak', '2026-12-28', '11:00'),
    ]);
    expect(sorted.map((entry) => entry.kind)).toEqual([
      'tilak',
      'haldi',
      'mehndi',
      'wedding',
      'reception',
    ]);
  });

  it('moves a card when its date changes', () => {
    const sorted = sortFestivities([
      card('wedding', '2026-12-30'),
      card('reception', '2026-12-20'),
    ]);
    expect(sorted.map((entry) => entry.kind)).toEqual(['reception', 'wedding']);
  });

  it('puts undated functions round the wedding in the usual order', () => {
    const sorted = sortFestivities([
      card('reception', null),
      card('wedding', '2026-12-30', '19:00'),
      card('sangeet', null),
      card('tilak', null),
    ]);
    expect(sorted.map((entry) => entry.kind)).toEqual(['tilak', 'sangeet', 'wedding', 'reception']);
  });

  it('keeps the usual order when nothing has a date', () => {
    const sorted = sortFestivities([
      card('reception', null),
      card('wedding', null),
      card('haldi', null),
    ]);
    expect(sorted.map((entry) => entry.kind)).toEqual(['haldi', 'wedding', 'reception']);
  });
});

describe('festivityCards', () => {
  const wedding = { date: '2026-12-30', time: null, venue: null, mapsUrl: null };

  it('is empty with no function, so the wedding never shows alone', () => {
    expect(festivityCards([], wedding)).toEqual([]);
  });

  it('adds the wedding to the functions', () => {
    const cards = festivityCards([emptyFunction('reception'), emptyFunction('haldi')], wedding);
    expect(cards.map((entry) => entry.kind)).toEqual(['haldi', 'wedding', 'reception']);
  });
});

describe('formatFestivityDate', () => {
  it('reads like the design: Mon · 28 Dec 2026', () => {
    expect(formatFestivityDate('2026-12-28')).toBe('Mon · 28 Dec 2026');
  });

  it('returns anything else as it is', () => {
    expect(formatFestivityDate('soon')).toBe('soon');
  });
});

describe('parseWeddingFunctions', () => {
  it('keeps only the ticked functions, and turns empty fields into null', () => {
    const result = parseWeddingFunctions({
      'haldi.on': '1',
      'haldi.date': '2026-12-29',
      'haldi.time': '10:00',
      'haldi.venue': ' Deera Nilayam Lawns ',
      'haldi.mapsUrl': MAPS,
      'mehndi.date': '2026-12-29',
      'reception.on': '1',
    });
    expect(result).toEqual({
      ok: true,
      functions: [
        {
          kind: 'haldi',
          date: '2026-12-29',
          time: '10:00',
          venue: 'Deera Nilayam Lawns',
          mapsUrl: MAPS,
        },
        emptyFunction('reception'),
      ],
    });
  });

  it('keys each problem by its field', () => {
    const result = parseWeddingFunctions({
      'tilak.on': '1',
      'tilak.time': '7pm',
      'tilak.mapsUrl': 'https://evil.example/maps',
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        'tilak.time': expect.any(String),
        'tilak.mapsUrl': expect.any(String),
      },
    });
  });

  it('saves no functions when none is ticked', () => {
    expect(parseWeddingFunctions({})).toEqual({ ok: true, functions: [] });
  });
});

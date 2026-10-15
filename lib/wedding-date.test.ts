import { describe, expect, it } from 'vitest';

import {
  addToCalendarUrl,
  countdownParts,
  daysUntil,
  foreverStartsLine,
  formatShortWeddingDate,
  formatWeddingDate,
  formatWeddingTime,
  todayInIndia,
  weddingDateParts,
  weddingStartsAt,
} from '@/lib/wedding-date';

describe('formatWeddingDate', () => {
  it('writes the day in full, without shifting it by a time zone', () => {
    expect(formatWeddingDate('2026-03-09')).toBe('Monday, 9 March 2026');
  });

  it('returns the input when it is not a date', () => {
    expect(formatWeddingDate('soon')).toBe('soon');
  });
});

describe('formatShortWeddingDate', () => {
  it('gives the day and month', () => {
    expect(formatShortWeddingDate('2026-03-09')).toBe('9 March');
  });

  it('returns a malformed value unchanged', () => {
    expect(formatShortWeddingDate('soon')).toBe('soon');
  });
});

describe('wedding time and countdown', () => {
  it('reads a 24-hour time as people say it', () => {
    expect(formatWeddingTime('19:00')).toBe('7:00 PM');
    expect(formatWeddingTime('00:30')).toBe('12:30 AM');
    expect(formatWeddingTime('12:05')).toBe('12:05 PM');
  });

  it('starts the wedding in India Standard Time', () => {
    expect(new Date(weddingStartsAt('2026-03-09', '19:00')).toISOString()).toBe(
      '2026-03-09T13:30:00.000Z',
    );
    expect(new Date(weddingStartsAt('2026-03-09', null)).toISOString()).toBe(
      '2026-03-08T18:30:00.000Z',
    );
  });

  it('splits the time left, and ends at zero', () => {
    const start = Date.parse('2026-03-09T13:30:00Z');
    expect(countdownParts(start, start - (2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
    expect(countdownParts(start, start)).toBeNull();
  });
});

describe('the sign-up countdown', () => {
  it('counts whole calendar days', () => {
    expect(daysUntil('2026-11-14', '2026-10-15')).toBe(30);
    expect(daysUntil('2026-10-15', '2026-10-15')).toBe(0);
    expect(daysUntil('2026-10-14', '2026-10-15')).toBe(-1);
    expect(daysUntil('soon', '2026-10-15')).toBeNull();
  });

  it('says when forever starts', () => {
    expect(foreverStartsLine(30)).toBe('Your forever starts in 30 days');
    expect(foreverStartsLine(1)).toBe('Your forever starts tomorrow');
    expect(foreverStartsLine(0)).toBe('Your forever starts today');
    expect(foreverStartsLine(1000)).toBe('Your forever starts in 1,000 days');
    expect(foreverStartsLine(-1)).toBeNull();
  });

  it('reads today in India', () => {
    expect(todayInIndia(new Date('2026-10-14T20:00:00Z'))).toBe('2026-10-15');
  });
});

describe('weddingDateParts', () => {
  it('splits a date into the scratch cards', () => {
    expect(weddingDateParts('2026-12-07')).toEqual({
      day: '07',
      month: 'December',
      monthNumber: '12',
      year: '2026',
    });
  });

  it('refuses anything that is not a date', () => {
    expect(weddingDateParts('2026-13-01')).toBeNull();
    expect(weddingDateParts('soon')).toBeNull();
  });
});

describe('addToCalendarUrl', () => {
  it('adds a three-hour event in India time when the time is known', () => {
    const url = new URL(
      addToCalendarUrl({
        title: 'Riya & Arjun',
        isoDate: '2026-12-12',
        time: '19:00',
        location: 'The Grand Pavilion, New Delhi',
        details: 'Join us',
      }),
    );
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261212T133000Z/20261212T163000Z');
    expect(url.searchParams.get('location')).toBe('The Grand Pavilion, New Delhi');
  });

  it('adds the whole day without a time', () => {
    const url = new URL(
      addToCalendarUrl({
        title: 'Riya & Arjun',
        isoDate: '2026-12-31',
        time: null,
        location: null,
        details: 'Join us',
      }),
    );
    expect(url.searchParams.get('dates')).toBe('20261231/20270101');
    expect(url.searchParams.has('location')).toBe(false);
  });
});

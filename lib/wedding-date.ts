/**
 * Formats a wedding day for an invite. Pure.
 *
 * The day is stored as `YYYY-MM-DD`, a date on a calendar with no time and no
 * zone. It is formatted in UTC on purpose: parsing `2026-03-09` gives
 * midnight UTC, so any other zone could show the day before.
 */
export function formatWeddingDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** The short form for a link preview title: `9 March`. */
export function formatShortWeddingDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * The ceremony's start time as people read it: `19:00` → `7:00 PM`. Stored as
 * `HH:MM` on a 24-hour clock, with no zone, like the date.
 */
export function formatWeddingTime(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (match === null) return time;
  const hours = Number(match[1]);
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

/**
 * The moment the wedding starts, in milliseconds since the epoch, for the
 * countdown. Every wedding is in India for now, so the date and time are read
 * in India Standard Time (UTC+05:30, no daylight saving). Without a time, the
 * countdown runs to the start of the day.
 */
export function weddingStartsAt(isoDate: string, time: string | null): number {
  return Date.parse(`${isoDate}T${time ?? '00:00'}:00+05:30`);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Whole days, hours, minutes and seconds left, or `null` once the time has come. */
export function countdownParts(target: number, now: number): CountdownParts | null {
  const left = target - now;
  if (Number.isNaN(left) || left <= 0) return null;
  const seconds = Math.floor(left / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/** Today as `YYYY-MM-DD` in India, where the couples are. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/**
 * Whole calendar days from `today` to the wedding day, both `YYYY-MM-DD`.
 * Negative for a day in the past, `null` when either value is not a date.
 */
export function daysUntil(isoDate: string, today: string): number | null {
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  const start = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(target) || Number.isNaN(start)) return null;
  return Math.round((target - start) / 86_400_000);
}

/**
 * The line the sign-up card shows once a couple picks their day: "Your
 * forever starts in 30 days". `null` for a day in the past, which the form
 * reports as an error instead.
 */
export function foreverStartsLine(days: number): string | null {
  if (days < 0) return null;
  if (days === 0) return 'Your forever starts today';
  if (days === 1) return 'Your forever starts tomorrow';
  return `Your forever starts in ${new Intl.NumberFormat('en-IN').format(days)} days`;
}

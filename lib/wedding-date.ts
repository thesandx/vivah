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

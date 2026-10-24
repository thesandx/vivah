/**
 * Which rows the admin "Clear test data" page offers to erase, and which it
 * ticks to start with. Pure, so every rule is tested without a database.
 *
 * The rule from the request: keep every couple who paid and whose invite is
 * live. Everything else may go. The admin still decides row by row: a ticked
 * box is a suggestion, and the server erases only what the form sends.
 */

import { nudgeStatus } from '@/lib/preview-nudges';

/** The most rows one "Erase" sends. Far above today's volume. */
export const ERASE_LIMIT = 200;

/** The word the admin types to confirm. */
export const ERASE_CONFIRM_WORD = 'ERASE';

export interface CleanupLead {
  id: string;
  status: string;
  createdAt: Date;
  deletedAt: Date | null;
  weddingDate: string | null;
}

export interface CleanupWedding {
  id: string;
  leadId: string;
  deletedAt: Date | null;
}

/**
 * `kept`: never offered, because the couple's invite is live.
 * `ticked`: offered, and ticked to start with.
 * `unticked`: offered, but the admin must tick it. An unpaid preview still
 * in its week of nudges can be a real couple who has not decided yet.
 */
export type CleanupChoice = 'kept' | 'ticked' | 'unticked';

/** The ids of the previews whose invite is live (a wedding that is not deleted). */
export function liveLeadIds(weddings: readonly CleanupWedding[]): Set<string> {
  return new Set(weddings.filter((row) => row.deletedAt === null).map((row) => row.leadId));
}

export function leadCleanupChoice(
  lead: CleanupLead,
  live: ReadonlySet<string>,
  now: Date,
): CleanupChoice {
  if (live.has(lead.id)) return 'kept';
  const nudge = nudgeStatus(lead, now);
  return nudge.kind === 'due' || nudge.kind === 'starts' ? 'unticked' : 'ticked';
}

/** A deleted invite is always offered and ticked. A live one is never offered. */
export function weddingCleanupChoice(wedding: CleanupWedding): CleanupChoice {
  return wedding.deletedAt === null ? 'kept' : 'ticked';
}

/** The ids the form sent under `name`: document ids only, no repeats, at most `ERASE_LIMIT`. */
export function parseEraseIds(values: readonly unknown[]): string[] {
  const ids = values.filter(
    (value): value is string => typeof value === 'string' && /^[A-Za-z0-9]{20}$/.test(value),
  );
  return [...new Set(ids)].slice(0, ERASE_LIMIT);
}

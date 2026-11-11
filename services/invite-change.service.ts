import 'server-only';

import { z } from 'zod';

import {
  INVITE_CHANGE_AREAS,
  type InviteChangeArea,
  type InviteChangeLine,
  inviteChangeLineSchema,
  MAX_CHANGE_LINES,
} from '@/lib/invite-changes';
import { logger } from '@/lib/logger';
import { createRepository, type StoredDocument } from '@/services/repository';

/**
 * The couple's change log: one document per dashboard save that changed
 * something on their live invite (ADR-0020). `/admin/invites/<id>` lists it.
 *
 * It lives in `weddings/{weddingId}/inviteChanges`, because a couple can save any
 * number of times (unbounded is a subcollection). Append-only: nothing
 * updates or deletes an entry, except "Clear test data" with its wedding.
 *
 * The admin's own edits are not here. They are in `adminAudit`.
 */

export const INVITE_CHANGE_COLLECTION = 'inviteChanges';

export const inviteChangeSchema = z.object({
  area: z.enum(INVITE_CHANGE_AREAS),
  lines: z.array(inviteChangeLineSchema).min(1).max(MAX_CHANGE_LINES),
});

export type InviteChangePayload = z.infer<typeof inviteChangeSchema>;
export type InviteChangeDocument = StoredDocument<InviteChangePayload>;

/** The repository for one wedding's log. Opens no connection. */
function changesOf(weddingId: string) {
  return createRepository({
    collection: `weddings/${weddingId}/${INVITE_CHANGE_COLLECTION}`,
    schema: inviteChangeSchema,
  });
}

/** The most entries the admin card shows. */
export const CHANGE_LOG_LIMIT = 100;

/**
 * Records one save. A save that changed nothing records nothing. It never
 * throws: the couple's save already succeeded, and a lost log line must not
 * tell them it failed. A failure is logged with the wedding id only.
 */
export async function recordInviteChange(
  weddingId: string,
  area: InviteChangeArea,
  lines: readonly InviteChangeLine[],
): Promise<void> {
  if (lines.length === 0) return;
  try {
    await changesOf(weddingId).create({ area, lines: lines.slice(0, MAX_CHANGE_LINES) });
  } catch (error) {
    logger.error('Recording an invite change failed', error, { weddingId, area });
  }
}

/** The wedding's latest changes, newest first. Uses the automatic `createdAt` order. */
export async function listInviteChanges(
  weddingId: string,
): Promise<{ items: readonly InviteChangeDocument[]; more: boolean }> {
  const page = await changesOf(weddingId).list({ limit: CHANGE_LOG_LIMIT });
  return { items: page.items, more: page.nextCursor !== null };
}

/**
 * Erases a wedding's log for good. Only for the admin's "Clear test data", on
 * a wedding that is erased next (ADR-0016). Returns how many it erased.
 */
export async function eraseInviteChanges(weddingId: string): Promise<number> {
  const repository = changesOf(weddingId);
  let erased = 0;
  for (;;) {
    const page = await repository.list({ limit: 200, includeDeleted: true });
    for (const entry of page.items) {
      // eslint-disable-next-line data-safety/no-permanent-delete -- admin erasing a deleted test invite (ADR-0016)
      await repository.hardDelete(entry.id);
      erased += 1;
    }
    if (page.nextCursor === null || page.items.length === 0) return erased;
  }
}

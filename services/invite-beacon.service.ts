import 'server-only';

import { z } from 'zod';

import { inviteBeaconSchema } from '@/lib/invite-tracking';
import { createRepository, MAX_PAGE_SIZE, type StoredDocument } from '@/services/repository';

/**
 * Live invite beacons: one document per open, envelope tap or RSVP tap on a
 * couple's invite (ADR-0020). `/admin/invites/<id>` reads them per wedding
 * and counts them (`lib/invite-visit-report.ts`).
 *
 * Append-only. A beacon holds the wedding's id, fixed ids, a flag and a
 * random tab id. Nothing updates or deletes one; a TTL policy on `expireAt`
 * removes it after 12 months.
 */

export const INVITE_BEACON_COLLECTION = 'inviteBeacons';

export const storedInviteBeaconSchema = inviteBeaconSchema.extend({
  /** When a Firestore TTL policy may remove the beacon: the privacy page promises 12 months. */
  expireAt: z.date(),
});

export type StoredInviteBeaconPayload = z.infer<typeof storedInviteBeaconSchema>;
export type StoredInviteBeaconDocument = StoredDocument<StoredInviteBeaconPayload>;

export const inviteBeacons = createRepository({
  collection: INVITE_BEACON_COLLECTION,
  schema: storedInviteBeaconSchema,
});

/** How long a beacon is kept. The privacy page says so. */
export const INVITE_BEACON_TTL_DAYS = 365;

/**
 * The most beacons one invite's card reads. A wedding of 500 guests who each
 * open the invite three times and tap it twice is about 2,500. Above the cap
 * the card counts the newest ones and says so.
 */
export const INVITE_VISITS_CAP = 5000;

/** Stores one beacon. */
export async function recordInviteBeacon(
  beacon: z.infer<typeof inviteBeaconSchema>,
  now: Date = new Date(),
): Promise<void> {
  await inviteBeacons.create({
    ...beacon,
    expireAt: new Date(now.getTime() + INVITE_BEACON_TTL_DAYS * 24 * 60 * 60_000),
  });
}

/**
 * One wedding's beacons, newest first, up to `INVITE_VISITS_CAP`. Uses the
 * composite index `weddingId` + `createdAt` in `firestore.indexes.json`.
 * `includeDeleted` because nothing is deleted here, and it keeps the query on
 * that index.
 */
export async function inviteBeaconsFor(
  weddingId: string,
): Promise<{ items: StoredInviteBeaconDocument[]; capped: boolean }> {
  const items: StoredInviteBeaconDocument[] = [];
  let cursor: string | undefined;
  do {
    const page = await inviteBeacons.list({
      limit: Math.min(MAX_PAGE_SIZE, INVITE_VISITS_CAP - items.length),
      where: [['weddingId', '==', weddingId]],
      includeDeleted: true,
      ...(cursor !== undefined && { cursor }),
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && items.length < INVITE_VISITS_CAP);
  return { items, capped: cursor !== undefined };
}

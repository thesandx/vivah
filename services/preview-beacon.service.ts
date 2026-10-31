import 'server-only';

import { z } from 'zod';

import { previewBeaconSchema } from '@/lib/preview-tracking';
import {
  createRepository,
  MAX_PAGE_SIZE,
  type QueryFilter,
  type StoredDocument,
} from '@/services/repository';

/**
 * Preview page beacons: one document per report the preview page sends
 * (ADR-0019). `/admin` reads them per preview and merges them into the
 * preview funnel (`lib/preview-report.ts`).
 *
 * Append-only. A beacon holds the preview's id, fixed ids, numbers and a
 * random tab id. Nothing updates or deletes one.
 */

export const PREVIEW_BEACON_COLLECTION = 'previewBeacons';

export const storedPreviewBeaconSchema = previewBeaconSchema.omit({ seq: true }).extend({
  seq: z.number().int().min(0),
  /** When a Firestore TTL policy may remove the beacon: the privacy page promises 12 months. */
  expireAt: z.date(),
});

export type StoredPreviewBeaconPayload = z.infer<typeof storedPreviewBeaconSchema>;
export type StoredPreviewBeaconDocument = StoredDocument<StoredPreviewBeaconPayload>;

export const previewBeacons = createRepository({
  collection: PREVIEW_BEACON_COLLECTION,
  schema: storedPreviewBeaconSchema,
});

/** How long a beacon is kept. The privacy page says so. */
export const PREVIEW_BEACON_TTL_DAYS = 365;

/** The most beacons the funnel reads. Far above today's traffic; the page says when it is hit. */
export const PREVIEW_REPORT_CAP = 6000;

/** The most beacons one preview's activity card reads. */
export const PREVIEW_ACTIVITY_CAP = 400;

/** Stores one beacon. */
export async function recordPreviewBeacon(
  beacon: z.infer<typeof previewBeaconSchema>,
  now: Date = new Date(),
): Promise<void> {
  await previewBeacons.create({
    ...beacon,
    expireAt: new Date(now.getTime() + PREVIEW_BEACON_TTL_DAYS * 24 * 60 * 60_000),
  });
}

/** Reads pages of beacons until the end or `cap`. */
async function readAll(
  where: readonly QueryFilter[],
  cap: number,
): Promise<{ items: StoredPreviewBeaconDocument[]; capped: boolean }> {
  const items: StoredPreviewBeaconDocument[] = [];
  let cursor: string | undefined;
  do {
    const page = await previewBeacons.list({
      limit: Math.min(MAX_PAGE_SIZE, cap - items.length),
      where,
      includeDeleted: true,
      ...(cursor !== undefined && { cursor }),
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && items.length < cap);
  return { items, capped: cursor !== undefined };
}

/**
 * The beacons stored since `since`, newest first, up to `PREVIEW_REPORT_CAP`.
 * `includeDeleted` because nothing is deleted here, and it keeps the query on
 * the automatic single-field index on `createdAt`.
 */
export function previewBeaconsSince(
  since: Date,
): Promise<{ items: StoredPreviewBeaconDocument[]; capped: boolean }> {
  return readAll([['createdAt', '>=', since]], PREVIEW_REPORT_CAP);
}

/**
 * One preview's beacons, newest first, up to `PREVIEW_ACTIVITY_CAP`. Uses the
 * composite index `leadId` + `createdAt` in `firestore.indexes.json`.
 */
export function previewBeaconsFor(
  leadId: string,
): Promise<{ items: StoredPreviewBeaconDocument[]; capped: boolean }> {
  return readAll([['leadId', '==', leadId]], PREVIEW_ACTIVITY_CAP);
}

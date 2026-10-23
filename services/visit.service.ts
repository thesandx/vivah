import 'server-only';

import { z } from 'zod';

import { VISIT_SOURCES, visitBeaconSchema } from '@/lib/visit-tracking';
import { createRepository, MAX_PAGE_SIZE, type StoredDocument } from '@/services/repository';

/**
 * Home page visit beacons: one document per report a browser sends when the
 * visitor hides or leaves the page (ADR-0014). `/admin` merges them into
 * visits and counts them (`lib/visit-report.ts`).
 *
 * Append-only. A beacon holds fixed ids, numbers and a random tab id, and
 * nothing that names a person. Nothing updates or deletes one.
 */

export const VISIT_BEACON_COLLECTION = 'visitBeacons';

export const storedBeaconSchema = visitBeaconSchema
  .omit({ seq: true, source: true, campaign: true, lead: true })
  .extend({
    seq: z.number().int().min(0),
    // Firestore drops `undefined`, so the optional fields are stored as null.
    source: z.enum(VISIT_SOURCES).nullable(),
    campaign: z.string().max(60).nullable(),
    lead: visitBeaconSchema.shape.lead.unwrap().nullable(),
    /** When a Firestore TTL policy may remove the beacon: the privacy page promises 12 months. */
    expireAt: z.date(),
  });

export type StoredBeaconPayload = z.infer<typeof storedBeaconSchema>;
export type StoredBeaconDocument = StoredDocument<StoredBeaconPayload>;

export const visitBeacons = createRepository({
  collection: VISIT_BEACON_COLLECTION,
  schema: storedBeaconSchema,
});

/** How long a beacon is kept. The privacy page says so. */
export const VISIT_BEACON_TTL_DAYS = 365;

/** The most beacons the report reads. Far above today's traffic; the page says when it is hit. */
export const VISIT_REPORT_CAP = 6000;

/** Stores one beacon. */
export async function recordVisitBeacon(
  beacon: z.infer<typeof visitBeaconSchema>,
  now: Date = new Date(),
): Promise<void> {
  await visitBeacons.create({
    visitId: beacon.visitId,
    seq: beacon.seq,
    device: beacon.device,
    source: beacon.source ?? null,
    campaign: beacon.campaign ?? null,
    sectionMs: beacon.sectionMs,
    clicks: beacon.clicks,
    steps: beacon.steps,
    lead: beacon.lead ?? null,
    expireAt: new Date(now.getTime() + VISIT_BEACON_TTL_DAYS * 24 * 60 * 60_000),
  });
}

/**
 * The beacons stored since `since`, newest first, up to `VISIT_REPORT_CAP`.
 * `includeDeleted` because nothing is deleted here, and it keeps the query on
 * the automatic single-field index on `createdAt`.
 */
export async function beaconsSince(
  since: Date,
): Promise<{ items: StoredBeaconDocument[]; capped: boolean }> {
  const items: StoredBeaconDocument[] = [];
  let cursor: string | undefined;
  do {
    const page = await visitBeacons.list({
      limit: MAX_PAGE_SIZE,
      where: [['createdAt', '>=', since]],
      includeDeleted: true,
      ...(cursor !== undefined && { cursor }),
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && items.length < VISIT_REPORT_CAP);
  return { items, capped: cursor !== undefined };
}

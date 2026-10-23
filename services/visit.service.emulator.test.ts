// @vitest-environment node

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

/**
 * Visit beacons against the real Firestore emulator: the stored shape reads
 * back through the schema (absent fields as `null`, `expireAt` a date), and
 * the report's range query needs no composite index.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const { beaconsSince, recordVisitBeacon, VISIT_BEACON_TTL_DAYS } =
  await import('@/services/visit.service');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

describeEmulator('visit.service (emulator)', () => {
  it('stores a beacon and reads it back in the range', async () => {
    const visitId = randomUUID();
    const before = new Date(Date.now() - 60_000);
    const now = new Date();
    await recordVisitBeacon(
      {
        visitId,
        seq: 0,
        device: 'phone',
        source: 'instagram',
        sectionMs: { hero: 4200, try: 1500 },
        clicks: ['try-cta'],
        steps: ['started'],
      },
      now,
    );
    await recordVisitBeacon({
      visitId,
      seq: 1,
      device: 'phone',
      sectionMs: {},
      clicks: [],
      steps: ['made'],
      lead: { id: 'AbCdEfGhIjKlMnOpQrSt', cta: 'try-cta' },
    });

    const { items, capped } = await beaconsSince(before);
    expect(capped).toBe(false);
    const mine = items.filter((item) => item.visitId === visitId);
    expect(mine).toHaveLength(2);
    const first = mine.find((item) => item.seq === 0);
    const second = mine.find((item) => item.seq === 1);
    expect(first).toMatchObject({
      source: 'instagram',
      campaign: null,
      lead: null,
      sectionMs: { hero: 4200, try: 1500 },
      clicks: ['try-cta'],
    });
    expect(first?.expireAt.getTime()).toBe(now.getTime() + VISIT_BEACON_TTL_DAYS * 86_400_000);
    expect(second).toMatchObject({ source: null, lead: { id: 'AbCdEfGhIjKlMnOpQrSt' } });
  });

  it('leaves out beacons older than the range', async () => {
    const visitId = randomUUID();
    await recordVisitBeacon({
      visitId,
      seq: 0,
      device: 'desktop',
      sectionMs: { hero: 2000 },
      clicks: [],
      steps: [],
    });
    const { items } = await beaconsSince(new Date(Date.now() + 60_000));
    expect(items.some((item) => item.visitId === visitId)).toBe(false);
  });
});

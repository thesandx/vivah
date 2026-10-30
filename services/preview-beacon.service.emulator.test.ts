// @vitest-environment node

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

/**
 * Preview beacons against the real Firestore emulator: the stored shape reads
 * back through the schema, and both reads (by preview, and by range) work.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const { previewBeaconsFor, previewBeaconsSince, recordPreviewBeacon } =
  await import('@/services/preview-beacon.service');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

/** A random 20-character id, like a Firestore auto id. */
function leadId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 20);
}

describeEmulator('preview-beacon.service (emulator)', () => {
  it('stores beacons and reads them back by preview, newest first, and by range', async () => {
    const lead = leadId();
    const other = leadId();
    const viewId = randomUUID();
    const before = new Date(Date.now() - 60_000);
    const base = { viewId, device: 'phone' as const, viewer: 'couple' as const };
    await recordPreviewBeacon({
      ...base,
      leadId: lead,
      seq: 0,
      sectionMs: { names: 3000 },
      events: ['opened'],
    });
    await recordPreviewBeacon({
      ...base,
      leadId: lead,
      seq: 1,
      sectionMs: {},
      events: ['pay-tapped', 'checkout-opened'],
    });
    await recordPreviewBeacon({
      ...base,
      leadId: other,
      seq: 0,
      sectionMs: {},
      events: ['opened'],
    });

    const mine = await previewBeaconsFor(lead);
    expect(mine.capped).toBe(false);
    expect(mine.items.map((item) => item.seq)).toEqual([1, 0]);
    expect(mine.items[1]?.sectionMs).toEqual({ names: 3000 });
    expect(mine.items[0]?.expireAt).toBeInstanceOf(Date);

    const recent = await previewBeaconsSince(before);
    const leads = new Set(recent.items.map((item) => item.leadId));
    expect(leads.has(lead) && leads.has(other)).toBe(true);
  });
});

// @vitest-environment node

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

/**
 * Live invite beacons against the real Firestore emulator: the stored shape
 * reads back through the schema, by wedding, newest first.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const { inviteBeaconsFor, recordInviteBeacon } = await import('@/services/invite-beacon.service');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

/** A random 20-character id, like a Firestore auto id. */
function weddingId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 20);
}

describeEmulator('invite-beacon.service (emulator)', () => {
  it('stores beacons and reads one wedding’s back, newest first', async () => {
    const wedding = weddingId();
    const other = weddingId();
    const base = {
      viewId: randomUUID(),
      device: 'phone' as const,
      viewer: 'guest' as const,
      firstVisit: true,
    };
    await recordInviteBeacon({ ...base, weddingId: wedding, event: 'opened' });
    await recordInviteBeacon({
      ...base,
      weddingId: wedding,
      event: 'rsvp-tapped',
      guestLinkId: 'a'.repeat(64),
    });
    await recordInviteBeacon({ ...base, weddingId: other, event: 'opened' });

    const { items, capped } = await inviteBeaconsFor(wedding);
    expect(capped).toBe(false);
    expect(items.map((item) => item.event)).toEqual(['rsvp-tapped', 'opened']);
    expect(items[0]?.guestLinkId).toBe('a'.repeat(64));
    expect(items[0]?.expireAt.getTime()).toBeGreaterThan(Date.now() + 300 * 24 * 60 * 60_000);
  });
});

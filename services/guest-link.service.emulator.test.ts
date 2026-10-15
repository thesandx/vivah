// @vitest-environment node

import { beforeAll, describe, expect, it } from 'vitest';

import {
  createGuestLink,
  deleteGuestLink,
  guestLinkId,
  isGuestLinkDeleted,
  listGuestLinks,
} from '@/services/guest-link.service';
import { createLead, openPreviewLink } from '@/services/lead.service';
import { getWeddingBySlug, publishWedding } from '@/services/wedding.service';

/**
 * Guest links, against the real Firestore emulator: the numbering of a second
 * guest of the same name is a transaction's guarantee, so a mock would prove
 * nothing.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const OWNER = '+919876543210';

/**
 * A published wedding at a fresh slug, so runs do not collide. Made once for
 * the file: each publish is a transaction over `weddings`, and the other
 * emulator suites publish in parallel, so fewer publishes keep the emulator's
 * lock queue short. Each test uses its own guest names instead.
 */
async function publishedWedding() {
  const slug = `links-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const id = await createLead({
    bride: 'Radha',
    groom: 'Shyam',
    weddingDate: null,
    phoneE164: OWNER,
    isBot: false,
  });
  const { newToken } = await openPreviewLink(id, undefined);
  await publishWedding(id, newToken ?? '', slug);
  const wedding = await getWeddingBySlug(slug);
  if (wedding === null) throw new Error('The wedding was not published.');
  return wedding;
}

describeEmulator('guest links (emulator)', () => {
  let wedding: Awaited<ReturnType<typeof publishedWedding>>;
  beforeAll(async () => {
    wedding = await publishedWedding();
  });

  it('makes a link from a name with spaces and lists it', async () => {
    expect(await createGuestLink(wedding.slug, OWNER, 'anil kapoor')).toEqual({
      ok: true,
      link: { name: 'Anil kapoor', segment: 'Anil-kapoor' },
    });
    const links = await listGuestLinks(wedding.id);
    expect(links.map((link) => link.segment)).toContain('Anil-kapoor');
  });

  it('numbers a second and a third guest of the same name', async () => {
    const segments = [];
    for (const name of ['Rahul', 'rahul', 'Rahul']) {
      const result = await createGuestLink(wedding.slug, OWNER, name);
      if (result.ok) segments.push(result.link.segment);
    }
    expect(segments).toEqual(['Rahul', 'Rahul-2', 'Rahul-3']);
  });

  it('never gives two taps at once the same link', async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() => createGuestLink(wedding.slug, OWNER, 'Priya')),
    );
    const segments = results.map((result) => (result.ok ? result.link.segment : null));
    expect(new Set(segments).size).toBe(3);
  });

  it('shows a deleted link as the general invite, and never reuses it', async () => {
    await createGuestLink(wedding.slug, OWNER, 'Kartheek');
    expect(await isGuestLinkDeleted(wedding.id, 'Kartheek')).toBe(false);

    expect(await deleteGuestLink(wedding.slug, OWNER, guestLinkId('kartheek'))).toEqual({
      ok: true,
    });
    expect(await isGuestLinkDeleted(wedding.id, 'kartheek')).toBe(true);
    const segments = (await listGuestLinks(wedding.id)).map((link) => link.segment);
    expect(segments).not.toContain('Kartheek');

    const again = await createGuestLink(wedding.slug, OWNER, 'Kartheek');
    expect(again).toMatchObject({ ok: true, link: { segment: 'Kartheek-2' } });
  });

  it('keeps a hand-typed link working', async () => {
    expect(await isGuestLinkDeleted(wedding.id, 'Anyone')).toBe(false);
  });

  it('refuses a stranger and an unusable name', async () => {
    expect(await createGuestLink(wedding.slug, '+910000000000', 'Meera')).toMatchObject({
      ok: false,
      reason: 'not-found',
    });
    expect(await createGuestLink(wedding.slug, OWNER, '<b>')).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
    await createGuestLink(wedding.slug, OWNER, 'Meera');
    expect(
      await deleteGuestLink(wedding.slug, '+910000000000', guestLinkId('meera')),
    ).toMatchObject({ ok: false, reason: 'not-found' });
    const segments = (await listGuestLinks(wedding.id)).map((link) => link.segment);
    expect(segments).toContain('Meera');
  });
});

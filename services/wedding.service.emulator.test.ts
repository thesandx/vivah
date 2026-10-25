// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { SONGS_DOC_ID } from '@/lib/wedding-songs';
import { createLead, leads, openPreviewLink } from '@/services/lead.service';
import {
  checkSlug,
  freeSlugSuggestions,
  getWeddingBySlug,
  publishWedding,
  slugClaimId,
  slugClaims,
  updateWeddingDetails,
  updateWeddingFunctions,
  updateWeddingSong,
  weddings,
  weddingsOwnedBy,
} from '@/services/wedding.service';
import { resetSongsCache, weddingSongs } from '@/services/wedding-songs.service';

/**
 * Publishing, against the real Firestore emulator: one address, one couple.
 * The guarantee is a transaction's, so a mock would prove nothing.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const REQUEST = {
  bride: 'Radha',
  groom: 'Shyam',
  weddingDate: null,
  phoneE164: '+919876543210',
  slug: null,
  isBot: false,
};

/** A fresh slug per test run, so runs do not collide in a reused emulator. */
function uniqueSlug(label: string): string {
  return `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function openedLead(
  song: { name: string; file: string } | null = null,
): Promise<{ id: string; token: string }> {
  const id = await createLead({ ...REQUEST, song });
  const { newToken } = await openPreviewLink(id, undefined);
  return { id, token: newToken ?? '' };
}

describeEmulator('publishWedding (emulator)', () => {
  it('publishes at a free address, claims it and marks the lead paid', async () => {
    const slug = uniqueSlug('free');
    const { id, token } = await openedLead();
    expect(await checkSlug(slug)).toEqual({ available: true });

    expect(await publishWedding(id, token, slug)).toEqual({ state: 'published', slug });

    const wedding = await getWeddingBySlug(slug);
    expect(wedding).toMatchObject({ slug, bride: 'Radha', groom: 'Shyam', leadId: id });
    expect(await slugClaims.get(slugClaimId(slug))).toMatchObject({ slug, leadId: id });
    expect(await leads.getOrThrow(id)).toMatchObject({ status: 'paid', weddingSlug: slug });
    expect(await checkSlug(slug)).toEqual({ available: false, reason: 'taken' });
  });

  it('carries the chosen song from the lead to the wedding', async () => {
    const slug = uniqueSlug('song');
    const song = { name: 'Kesariya', file: 'song-1-abc.mp3' };
    const { id, token } = await openedLead(song);
    await publishWedding(id, token, slug);
    expect((await getWeddingBySlug(slug))?.song).toEqual(song);
  });

  it('carries the chosen functions from the lead to the wedding, with no details yet', async () => {
    const slug = uniqueSlug('fn');
    const id = await createLead({ ...REQUEST, song: null, functions: ['haldi', 'reception'] });
    expect((await leads.getOrThrow(id)).functions).toEqual(['haldi', 'reception']);
    const { newToken } = await openPreviewLink(id, undefined);
    await publishWedding(id, newToken ?? '', slug);
    expect((await getWeddingBySlug(slug))?.functions).toEqual([
      { kind: 'haldi', date: null, time: null, venue: null, mapsUrl: null },
      { kind: 'reception', date: null, time: null, venue: null, mapsUrl: null },
    ]);
  });

  it('never gives a second couple an address that is taken', async () => {
    const slug = uniqueSlug('taken');
    const first = await openedLead();
    const second = await openedLead();
    await publishWedding(first.id, first.token, slug);

    expect(await publishWedding(second.id, second.token, slug)).toEqual({ state: 'taken' });
    expect((await getWeddingBySlug(slug))?.leadId).toBe(first.id);
    expect((await leads.getOrThrow(second.id)).status).toBe('opened');
  });

  it('lets exactly one of two simultaneous publishes win', async () => {
    const slug = uniqueSlug('race');
    const first = await openedLead();
    const second = await openedLead();
    const results = await Promise.all([
      publishWedding(first.id, first.token, slug),
      publishWedding(second.id, second.token, slug),
    ]);
    expect(results.map((result) => result.state).sort()).toEqual(['published', 'taken']);
    const page = await weddings.list({ limit: 10, where: [['slug', '==', slug]] });
    expect(page.items).toHaveLength(1);
    // The emulator holds the losing transaction until its lock times out,
    // then the client retries it: on a busy CI runner that alone can pass
    // the default 5 s, so this test gets more time. Nothing is skipped.
  }, 30_000);

  it('treats a wedding written without a claim as taken', async () => {
    const slug = uniqueSlug('legacy');
    await weddings.create({
      slug,
      bride: 'Sita',
      groom: 'Ram',
      weddingDate: null,
      ownerPhoneE164: '+919800000000',
      leadId: 'written-by-hand',
    });
    const { id, token } = await openedLead();
    expect(await checkSlug(slug)).toEqual({ available: false, reason: 'taken' });
    expect(await publishWedding(id, token, slug)).toEqual({ state: 'taken' });
  });

  it('answers a second tap with the address already published', async () => {
    const slug = uniqueSlug('again');
    const { id, token } = await openedLead();
    await publishWedding(id, token, slug);
    expect(await publishWedding(id, token, uniqueSlug('other'))).toEqual({
      state: 'already-published',
      slug,
    });
  });

  it('refuses another browser and a malformed address', async () => {
    const { id } = await openedLead();
    expect(await publishWedding(id, 'not-the-token', uniqueSlug('x'))).toEqual({
      state: 'other-browser',
    });
    expect((await publishWedding(id, undefined, 'www')).state).toBe('invalid');
  });

  it('suggests only free addresses, skipping one already published', async () => {
    const bride = `Radha${Math.random().toString(36).slice(2, 8)}`;
    const slugBride = bride.toLowerCase();
    expect(await freeSlugSuggestions(bride, 'Shyam')).toEqual([
      `${slugBride}-shyam`,
      `shyam-${slugBride}`,
    ]);

    const { id, token } = await openedLead();
    await publishWedding(id, token, `${slugBride}-shyam`);
    expect(await freeSlugSuggestions(bride, 'Shyam')).toEqual([
      `shyam-${slugBride}`,
      `${slugBride}-weds-shyam`,
    ]);
  });
});

describeEmulator('the dashboards (emulator)', () => {
  const FORM = {
    bride: 'Anushka',
    groom: 'Sandeep',
    weddingDate: '2026-03-09',
    ceremonyTime: '19:00',
    venueName: 'Laxmisagar',
    venueCity: 'Darbhanga, Bihar',
    venueMapsUrl: 'https://maps.app.goo.gl/Ek5VHxyC6qYr2sW86',
  };

  /** A wedding owned by a fresh phone number, so runs do not collide. */
  async function ownedWedding(): Promise<{ slug: string; phone: string }> {
    const slug = uniqueSlug('dash');
    const phone = `+9198${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    await weddings.create({
      slug,
      bride: 'Anu',
      groom: 'Sandy',
      weddingDate: null,
      ownerPhoneE164: phone,
      leadId: 'aaaaaaaaaaaaaaaaaaaa',
    });
    return { slug, phone };
  }

  it('lists only the weddings paid for from this number', async () => {
    const mine = await ownedWedding();
    await ownedWedding();
    const owned = await weddingsOwnedBy(mine.phone);
    expect(owned.map((wedding) => wedding.slug)).toEqual([mine.slug]);
  });

  it('lets the couple save their details, and clear one later', async () => {
    const { slug, phone } = await ownedWedding();
    expect(await updateWeddingDetails(slug, phone, FORM)).toEqual({ ok: true });
    expect(await getWeddingBySlug(slug)).toMatchObject({ ...FORM });

    await updateWeddingDetails(slug, phone, { ...FORM, venueMapsUrl: '' });
    expect((await getWeddingBySlug(slug))?.venueMapsUrl).toBeNull();
  });

  it('answers anyone but the couple as if the address were unknown', async () => {
    const { slug } = await ownedWedding();
    expect(await updateWeddingDetails(slug, '+919000000000', FORM)).toEqual({
      ok: false,
      reason: 'not-found',
    });
    expect(await updateWeddingDetails(slug, null, FORM)).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('lets the couple change their song from the list, and nobody else', async () => {
    const song = { name: 'Kesariya', file: 'song-2-dash.mp3' };
    const slots = { slot1: null, slot2: song, slot3: null, slot4: null };
    if ((await weddingSongs.get(SONGS_DOC_ID)) === null) {
      await weddingSongs.createWithId(SONGS_DOC_ID, slots, { minLength: SONGS_DOC_ID.length });
    } else {
      await weddingSongs.update(SONGS_DOC_ID, slots);
    }
    resetSongsCache();

    const { slug, phone } = await ownedWedding();
    expect(await updateWeddingSong(slug, '+919000000000', 2)).toEqual({
      ok: false,
      reason: 'not-found',
    });
    expect(await updateWeddingSong(slug, phone, 1)).toEqual({ ok: false, reason: 'invalid' });
    expect((await getWeddingBySlug(slug))?.song).toBeUndefined();

    expect(await updateWeddingSong(slug, phone, 2)).toEqual({ ok: true, name: 'Kesariya' });
    expect((await getWeddingBySlug(slug))?.song).toEqual(song);
  });

  it('lets the couple save their functions, and nobody else', async () => {
    const { slug, phone } = await ownedWedding();
    const haldi = {
      kind: 'haldi' as const,
      date: '2026-12-29',
      time: '10:00',
      venue: 'Deera Nilayam Lawns',
      mapsUrl: null,
    };
    expect(await updateWeddingFunctions(slug, '+919000000000', [haldi])).toEqual({
      ok: false,
      reason: 'not-found',
    });
    expect((await getWeddingBySlug(slug))?.functions).toBeUndefined();
    expect(await updateWeddingFunctions(slug, phone, [haldi])).toEqual({ ok: true });
    expect((await getWeddingBySlug(slug))?.functions).toEqual([haldi]);
  });

  it('names the fields that are wrong and saves nothing', async () => {
    const { slug, phone } = await ownedWedding();
    const result = await updateWeddingDetails(slug, phone, {
      ...FORM,
      ceremonyTime: '7pm',
    });
    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid',
      errors: { ceremonyTime: expect.any(String) },
    });
    expect((await getWeddingBySlug(slug))?.bride).toBe('Anu');
  });
});

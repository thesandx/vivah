// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { createLead, leads, openPreviewLink } from '@/services/lead.service';
import {
  checkSlug,
  getWeddingBySlug,
  publishWedding,
  slugClaimId,
  slugClaims,
  weddings,
} from '@/services/wedding.service';

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
  isBot: false,
};

/** A fresh slug per test run, so runs do not collide in a reused emulator. */
function uniqueSlug(label: string): string {
  return `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function openedLead(): Promise<{ id: string; token: string }> {
  const id = await createLead(REQUEST);
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
  });

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
});

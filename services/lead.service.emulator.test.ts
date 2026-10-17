// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { createLead, getPreview, leads, openPreviewLink } from '@/services/lead.service';
import { getWeddingBySlug, weddings } from '@/services/wedding.service';

/**
 * The preview link rules, against the real Firestore emulator: the first
 * browser binds the lead, a second browser is refused, and the link expires.
 * A transaction's behaviour is Firestore's, so a mock would prove nothing.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const REQUEST = {
  bride: 'Raadha',
  groom: 'Shyam',
  weddingDate: '2030-03-09',
  phoneE164: '+919876543210',
  slug: null,
  isBot: false,
};

describeEmulator('lead.service (emulator)', () => {
  it('shows the preview to anyone, and lets only two browsers publish', async () => {
    const id = await createLead(REQUEST);
    expect(await getPreview(id, undefined)).toEqual({ state: 'unopened' });

    const first = await openPreviewLink(id, undefined);
    expect(first.access).toBe('ok');
    expect(first.newToken).not.toBeNull();
    const token = first.newToken ?? '';

    const stored = await leads.getOrThrow(id);
    expect(stored.status).toBe('opened');
    // The token itself is never stored, only its hash.
    expect(stored.previewTokenHash).not.toBe(token);
    expect(stored.previewTokenHash).toHaveLength(64);

    const again = await openPreviewLink(id, token);
    expect(again).toEqual({ access: 'ok', newToken: null });

    // The WhatsApp link, opened in another browser, binds a second token.
    const second = await openPreviewLink(id, undefined);
    expect(second.access).toBe('ok');
    expect(second.newToken).not.toBeNull();
    const secondToken = second.newToken ?? '';
    expect((await leads.getOrThrow(id)).secondTokenHash).toHaveLength(64);
    expect(await openPreviewLink(id, secondToken)).toEqual({ access: 'ok', newToken: null });

    const third = await openPreviewLink(id, 'someone-elses-token');
    expect(third).toEqual({ access: 'ok', newToken: null });

    expect(await getPreview(id, token)).toMatchObject({ state: 'ok', canPublish: true });
    expect(await getPreview(id, secondToken)).toMatchObject({ state: 'ok', canPublish: true });
    expect(await getPreview(id, undefined)).toMatchObject({ state: 'ok', canPublish: false });
  });

  it('closes the preview for everyone 30 minutes after the first open', async () => {
    const created = new Date('2030-01-01T00:00:00Z');
    const id = await createLead(REQUEST, created);
    const opened = new Date(created.getTime() + 60 * 60 * 1000);
    const { newToken } = await openPreviewLink(id, undefined, opened);
    const token = newToken ?? '';
    expect((await leads.getOrThrow(id)).viewEndsAt).toEqual(
      new Date(opened.getTime() + 30 * 60 * 1000),
    );

    // A reload, or another phone, does not restart the timer.
    const later = new Date(opened.getTime() + 20 * 60 * 1000);
    await openPreviewLink(id, undefined, later);
    expect((await leads.getOrThrow(id)).viewEndsAt).toEqual(
      new Date(opened.getTime() + 30 * 60 * 1000),
    );
    expect((await getPreview(id, token, later)).state).toBe('ok');

    const over = new Date(opened.getTime() + 30 * 60 * 1000);
    expect(await getPreview(id, token, over)).toEqual({ state: 'expired' });
    expect(await openPreviewLink(id, token, over)).toEqual({ access: 'expired', newToken: null });
  });

  it('stores the chosen address as a wish, and nothing when there is none', async () => {
    const chosen = await leads.getOrThrow(await createLead({ ...REQUEST, slug: 'virushka' }));
    expect(chosen.desiredSlug).toBe('virushka');
    const none = await leads.getOrThrow(await createLead(REQUEST));
    expect(none.desiredSlug).toBeUndefined();
  });

  it('expires the link after 48 hours', async () => {
    const created = new Date('2030-01-01T00:00:00Z');
    const id = await createLead(REQUEST, created);
    const later = new Date(created.getTime() + 49 * 60 * 60 * 1000);
    expect(await openPreviewLink(id, undefined, later)).toEqual({
      access: 'expired',
      newToken: null,
    });
    expect(await getPreview(id, undefined, later)).toEqual({ state: 'expired' });
  });

  it('answers not-found for an unknown or malformed id, without a write', async () => {
    expect(await getPreview('aaaaaaaaaaaaaaaaaaaa', undefined)).toEqual({ state: 'not-found' });
    expect(await openPreviewLink('../etc/passwd', undefined)).toEqual({
      access: 'not-found',
      newToken: null,
    });
  });
});

describeEmulator('wedding.service (emulator)', () => {
  it('finds a wedding by its slug', async () => {
    const slug = `test-${Date.now().toString(36)}`;
    await weddings.create({
      slug,
      bride: 'Sita',
      groom: 'Ram',
      weddingDate: null,
      ownerPhoneE164: '+919876543210',
      leadId: 'aaaaaaaaaaaaaaaaaaaa',
    });

    expect((await getWeddingBySlug(slug))?.bride).toBe('Sita');
    expect(await getWeddingBySlug('nobody-here')).toBeNull();
    expect(await getWeddingBySlug('www')).toBeNull();
  });
});

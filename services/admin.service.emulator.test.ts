// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  changeWeddingAddress,
  deleteLead,
  deleteWedding,
  getWeddingForAdmin,
  listAllWeddings,
  reactivatePreview,
  releaseWeddingAddress,
  restoreLead,
  restoreWedding,
  setWeddingStatus,
} from '@/services/admin.service';
import { adminAudit } from '@/services/admin-audit.service';
import { createLead, getPreview, leads, openPreviewLink } from '@/services/lead.service';
import {
  checkSlug,
  getWeddingBySlug,
  publishWedding,
  slugClaimId,
  slugClaims,
} from '@/services/wedding.service';

/**
 * What `/admin` does to the data, against the real Firestore emulator: the
 * address moves and releases are transactions over three collections, so a
 * mock would prove nothing.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const ADMIN = 'AdminUid1234567890abcdefghi';

function uniqueSlug(label: string): string {
  return `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function published(): Promise<{ weddingId: string; leadId: string; slug: string }> {
  const slug = uniqueSlug('admin');
  const leadId = await createLead({
    bride: 'Radha',
    groom: 'Shyam',
    weddingDate: null,
    phoneE164: '+919876543210',
    slug: null,
    isBot: false,
  });
  const { newToken } = await openPreviewLink(leadId, undefined);
  await publishWedding(leadId, newToken ?? '', slug);
  const wedding = await getWeddingBySlug(slug);
  return { weddingId: wedding?.id ?? '', leadId, slug };
}

async function auditFor(targetId: string): Promise<string[]> {
  const page = await adminAudit.list({
    limit: 20,
    includeDeleted: true,
    where: [['targetId', '==', targetId]],
  });
  return page.items.map((entry) => entry.action);
}

describeEmulator('admin operations (emulator)', () => {
  it('pauses and resumes an invite, and logs both', async () => {
    const { weddingId, slug } = await published();
    expect((await setWeddingStatus(weddingId, 'unavailable', ADMIN)).ok).toBe(true);
    expect((await getWeddingBySlug(slug))?.status).toBe('unavailable');
    await setWeddingStatus(weddingId, 'live', ADMIN);
    expect((await getWeddingBySlug(slug))?.status).toBe('live');
    expect(await auditFor(weddingId)).toEqual(
      expect.arrayContaining(['wedding-paused', 'wedding-resumed']),
    );
  });

  it('moves an invite to a free address and frees the old one', async () => {
    const { weddingId, leadId, slug } = await published();
    const next = uniqueSlug('moved');
    expect((await changeWeddingAddress(weddingId, next, ADMIN)).ok).toBe(true);
    expect(await getWeddingBySlug(slug)).toBeNull();
    expect((await getWeddingBySlug(next))?.id).toBe(weddingId);
    expect(await checkSlug(slug)).toEqual({ available: true });
    expect(await slugClaims.get(slugClaimId(next))).toMatchObject({ weddingId });
    expect((await leads.getOrThrow(leadId)).weddingSlug).toBe(next);
    expect(await auditFor(weddingId)).toContain('wedding-address-changed');
  });

  it('refuses to move onto a taken address', async () => {
    const first = await published();
    const second = await published();
    const result = await changeWeddingAddress(first.weddingId, second.slug, ADMIN);
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/taken/) });
    expect((await getWeddingForAdmin(first.weddingId))?.slug).toBe(first.slug);
  });

  it('deletes softly, keeps the address, restores, and releases only when deleted', async () => {
    const { weddingId, slug } = await published();
    expect((await releaseWeddingAddress(weddingId, ADMIN)).ok).toBe(false);

    await deleteWedding(weddingId, ADMIN);
    expect(await getWeddingBySlug(slug)).toBeNull();
    expect(await checkSlug(slug)).toEqual({ available: false, reason: 'taken' });
    expect((await listAllWeddings()).items.some((row) => row.id === weddingId)).toBe(true);

    expect((await restoreWedding(weddingId, ADMIN)).ok).toBe(true);
    expect((await getWeddingBySlug(slug))?.id).toBe(weddingId);

    await deleteWedding(weddingId, ADMIN);
    expect((await releaseWeddingAddress(weddingId, ADMIN)).ok).toBe(true);
    expect(await checkSlug(slug)).toEqual({ available: true });

    // Released, then restored while still free: the claim comes back.
    expect((await restoreWedding(weddingId, ADMIN)).ok).toBe(true);
    expect(await slugClaims.get(slugClaimId(slug))).toMatchObject({ weddingId });
  });

  it('refuses to restore onto an address another couple took after the release', async () => {
    const { weddingId, slug } = await published();
    await deleteWedding(weddingId, ADMIN);
    await releaseWeddingAddress(weddingId, ADMIN);

    const otherLead = await createLead({
      bride: 'Mira',
      groom: 'Dev',
      weddingDate: null,
      phoneE164: '+919812345678',
      slug: null,
      isBot: false,
    });
    const { newToken } = await openPreviewLink(otherLead, undefined);
    expect(await publishWedding(otherLead, newToken ?? '', slug)).toMatchObject({
      state: 'published',
    });

    expect(await restoreWedding(weddingId, ADMIN)).toMatchObject({ ok: false });
  });

  it('reactivates a preview for any phone, and deletes and restores it', async () => {
    const leadId = await createLead({
      bride: 'Anu',
      groom: 'Sandy',
      weddingDate: null,
      phoneE164: '+919876543210',
      slug: null,
      isBot: false,
    });
    await openPreviewLink(leadId, undefined, new Date(Date.now() - 3 * 86_400_000));
    expect((await reactivatePreview(leadId, ADMIN)).ok).toBe(true);
    const lead = await leads.getOrThrow(leadId);
    expect(lead).toMatchObject({ previewTokenHash: null, status: 'preview-sent' });
    expect(lead.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // A new phone may now open it.
    const { access } = await openPreviewLink(leadId, undefined);
    expect(access).toBe('ok');

    await deleteLead(leadId, ADMIN);
    expect(await getPreview(leadId, undefined)).toEqual({ state: 'not-found' });
    await restoreLead(leadId, ADMIN);
    expect((await leads.get(leadId))?.id).toBe(leadId);
  });

  it('will not reactivate a paid preview', async () => {
    const { leadId } = await published();
    expect((await reactivatePreview(leadId, ADMIN)).ok).toBe(false);
  });
});

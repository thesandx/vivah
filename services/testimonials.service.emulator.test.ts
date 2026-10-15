// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The home page's reviews, chats and banner, against the real Firestore
 * emulator: adding, editing, reordering and removing are transactions with
 * their audit entries, so a mock would prove little. The bucket is mocked;
 * `lib/storage-paths.ts` and `storage.service.ts` have their own tests.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const finalizeUpload = vi.fn(async (tmpPath: string) => ({
  path: tmpPath.slice('tmp/'.length),
  contentType: 'image/webp',
  sizeBytes: 1000,
}));
const deleteObject = vi.fn(async (_path: string) => undefined);
vi.mock('@/services/storage.service', () => ({
  finalizeUpload: (tmpPath: string) => finalizeUpload(tmpPath),
  deleteObject: (path: string) => deleteObject(path),
  createSignedUploadUrl: vi.fn(),
}));
vi.mock('@/services/storage.client', () => ({ getBucket: vi.fn() }));

const { adminAudit } = await import('@/services/admin-audit.service');
const { chatStore, getHomeTestimonials, homeChats, reviewStore, saveBanner } =
  await import('@/services/testimonials.service');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

const ADMIN = 'AdminUid1234567890abcdefghi';
let uploads = 0;

function tmpChat(): string {
  uploads += 1;
  return `tmp/siteContent/home-chats/chat-u${Date.now().toString(36)}${uploads}.webp`;
}

function chat(message: string) {
  return { message, caption: '', app: 'whatsapp' };
}

async function clearChats(): Promise<void> {
  const { items } = await homeChats.list({ limit: 50 });
  await Promise.all(items.map((item) => homeChats.softDelete(item.id)));
}

describeEmulator('testimonials service (emulator)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearChats();
  });

  it('adds chats at the end of the row, and audits each one', async () => {
    expect((await chatStore.add(chat('First'), tmpChat(), ADMIN)).ok).toBe(true);
    expect((await chatStore.add(chat('Second'), tmpChat(), ADMIN)).ok).toBe(true);

    const { chats } = await getHomeTestimonials({ fresh: true });
    expect(chats.map((item) => item.message)).toEqual(['First', 'Second']);

    const audit = await adminAudit.list({
      limit: 5,
      where: [['targetId', '==', chats[0]?.id ?? '']],
      includeDeleted: true,
    });
    expect(audit.items.map((entry) => entry.action)).toContain('testimonial-added');
  });

  it('refuses an upload from another folder or kind', async () => {
    const result = await chatStore.add(
      chat('Sneaky'),
      'tmp/siteContent/home-reviews/review-abc.webp',
      ADMIN,
    );
    expect(result.ok).toBe(false);
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('refuses a review with no names', async () => {
    const result = await reviewStore.add(
      { quote: 'Lovely', names: '', relation: '', stars: '5' },
      'tmp/siteContent/home-reviews/review-abc.webp',
      ADMIN,
    );
    expect(result).toMatchObject({ ok: false, message: 'Type the couple’s names.' });
  });

  it('edits the words, replaces the image and removes the old one', async () => {
    await chatStore.add(chat('Old words'), tmpChat(), ADMIN);
    const [item] = (await getHomeTestimonials({ fresh: true })).chats;
    const replacement = tmpChat();

    expect((await chatStore.edit(item?.id ?? '', chat('New words'), replacement, ADMIN)).ok).toBe(
      true,
    );
    const [edited] = (await getHomeTestimonials({ fresh: true })).chats;
    expect(edited?.message).toBe('New words');
    expect(edited?.image).toBe(replacement.slice('tmp/'.length));
    expect(deleteObject).toHaveBeenCalledWith(item?.image);
  });

  it('moves an item and removes one softly', async () => {
    await chatStore.add(chat('A'), tmpChat(), ADMIN);
    await chatStore.add(chat('B'), tmpChat(), ADMIN);
    const [a] = (await getHomeTestimonials({ fresh: true })).chats;

    await chatStore.move(a?.id ?? '', 'down', ADMIN);
    expect((await getHomeTestimonials({ fresh: true })).chats.map((c) => c.message)).toEqual([
      'B',
      'A',
    ]);

    expect((await chatStore.remove(a?.id ?? '', ADMIN)).ok).toBe(true);
    expect((await getHomeTestimonials({ fresh: true })).chats.map((c) => c.message)).toEqual(['B']);
    expect(await homeChats.get(a?.id ?? '', { includeDeleted: true })).not.toBeNull();
  });

  it('sets and hides the banner line', async () => {
    await saveBanner({ headline: 'Loved by 500+ happy couples' }, ADMIN);
    expect((await getHomeTestimonials({ fresh: true })).headline).toBe(
      'Loved by 500+ happy couples',
    );
    await saveBanner({ headline: '' }, ADMIN);
    expect((await getHomeTestimonials({ fresh: true })).headline).toBe('');
  });
});

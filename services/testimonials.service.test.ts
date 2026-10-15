// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The rules of the testimonials service with an in-memory store: the checks
 * that run before anything is written, the cache, and the errors. The
 * emulator suite proves the same operations against real Firestore.
 */

const finalizeUpload = vi.fn(async (tmpPath: string) => ({
  path: tmpPath.slice('tmp/'.length),
  contentType: 'image/webp',
  sizeBytes: 10,
}));
const deleteObject = vi.fn(async (_path: string) => undefined);
const createSignedUploadUrl = vi.fn(async (request: unknown) => ({ request }));
vi.mock('@/services/storage.service', () => ({
  finalizeUpload: (tmpPath: string) => finalizeUpload(tmpPath),
  deleteObject: (path: string) => deleteObject(path),
  createSignedUploadUrl: (request: unknown) => createSignedUploadUrl(request),
}));

const download = vi.fn(async () => [Buffer.from('img')]);
const getMetadata = vi.fn(async () => [{ contentType: 'image/webp' }]);
vi.mock('@/services/storage.client', () => ({
  getBucket: () => ({ file: () => ({ download, getMetadata }) }),
}));

const recordAdminActionIn = vi.fn();
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminActionIn: (...args: unknown[]) => recordAdminActionIn(...args),
}));

type Row = Record<string, unknown> & { id: string; deletedAt: Date | null };

/** One in-memory collection per repository, keyed by collection name. */
const tables = new Map<string, Map<string, Row>>();
let nextId = 0;

vi.mock('@/services/repository', () => ({
  createRepository: ({ collection }: { collection: string }) => {
    const rows = () => {
      if (!tables.has(collection)) tables.set(collection, new Map());
      return tables.get(collection) as Map<string, Row>;
    };
    const live = (id: string) => {
      const row = rows().get(id);
      return row !== undefined && row.deletedAt === null ? row : null;
    };
    const writer = {
      get: async (id: string) => live(id),
      create: (payload: Record<string, unknown>) => {
        nextId += 1;
        const id = `Item${String(nextId).padStart(12, '0')}`;
        rows().set(id, { ...payload, id, deletedAt: null });
        return id;
      },
      createWithId: (id: string, payload: Record<string, unknown>) => {
        rows().set(id, { ...payload, id, deletedAt: null });
      },
      update: (id: string, patch: Record<string, unknown>) => {
        const row = rows().get(id);
        if (row !== undefined) rows().set(id, { ...row, ...patch });
      },
      softDelete: (id: string) => writer.update(id, { deletedAt: new Date() }),
    };
    return {
      get: async (id: string, options?: { includeDeleted?: boolean }) =>
        options?.includeDeleted === true ? (rows().get(id) ?? null) : live(id),
      list: async ({ limit }: { limit: number }) => ({
        items: [...rows().values()]
          .filter((row) => row.deletedAt === null)
          .sort((a, b) => Number(a.position) - Number(b.position))
          .slice(0, limit),
        nextCursor: null,
      }),
      runTransaction: async (fn: (repo: unknown, tx: unknown) => Promise<unknown>) =>
        fn(writer, {}),
    };
  },
}));

const service = await import('@/services/testimonials.service');
const { chatStore, getHomeTestimonials, resetTestimonialsCache, reviewStore, saveBanner } = service;

const ADMIN = 'AdminUid1234567890';
let uploads = 0;

function tmp(kind: 'chat' | 'review'): string {
  uploads += 1;
  return `tmp/siteContent/home-${kind}s/${kind}-u${uploads}.webp`;
}

const CHAT = { message: 'Thank you', caption: '', app: 'whatsapp' };
const REVIEW = { quote: 'Lovely', names: 'Riya & Aman', relation: '', stars: '5' };

describe('testimonials service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.clear();
    resetTestimonialsCache();
  });

  it('reads nothing as an empty home page, then caches for a minute', async () => {
    expect(await getHomeTestimonials()).toEqual({ chats: [], reviews: [], headline: '' });
    await chatStore.add(CHAT, tmp('chat'), ADMIN);
    resetTestimonialsCache();
    await getHomeTestimonials();
    tables.clear();
    expect((await getHomeTestimonials()).chats).toHaveLength(1);
    expect((await getHomeTestimonials({ fresh: true })).chats).toHaveLength(0);
  });

  it('signs an upload in the kind’s folder, and refuses an SVG', async () => {
    await service.createTestimonialUpload('review', 'image/jpeg');
    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.objectContaining({ collection: 'siteContent', docId: 'home-reviews' }),
      }),
    );
    await expect(service.createTestimonialUpload('chat', 'image/svg+xml')).rejects.toThrow();
  });

  it('adds with the next position and an audit entry', async () => {
    expect((await reviewStore.add(REVIEW, tmp('review'), ADMIN)).ok).toBe(true);
    expect((await reviewStore.add(REVIEW, tmp('review'), ADMIN)).ok).toBe(true);
    const { reviews } = await getHomeTestimonials({ fresh: true });
    expect(reviews.map((review) => review.position)).toEqual([0, 1]);
    expect(reviews[0]?.stars).toBe(5);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'testimonial-added', adminUid: ADMIN }),
    );
  });

  it('refuses bad fields and foreign uploads before it touches the bucket', async () => {
    expect((await chatStore.add({ ...CHAT, message: '' }, tmp('chat'), ADMIN)).ok).toBe(false);
    expect((await chatStore.add(CHAT, tmp('review'), ADMIN)).ok).toBe(false);
    expect((await chatStore.add(CHAT, 'siteContent/home-chats/chat-x.webp', ADMIN)).ok).toBe(false);
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('stops at the most a row takes', async () => {
    for (let index = 0; index < 12; index += 1) await chatStore.add(CHAT, tmp('chat'), ADMIN);
    const result = await chatStore.add(CHAT, tmp('chat'), ADMIN);
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toContain('12');
  });

  it('edits words alone, or words and image, and removes the replaced image', async () => {
    await chatStore.add(CHAT, tmp('chat'), ADMIN);
    const [item] = (await getHomeTestimonials({ fresh: true })).chats;
    const id = item?.id ?? '';

    expect((await chatStore.edit(id, { ...CHAT, message: 'New' }, null, ADMIN)).ok).toBe(true);
    expect(deleteObject).not.toHaveBeenCalled();

    const replacement = tmp('chat');
    expect((await chatStore.edit(id, CHAT, replacement, ADMIN)).ok).toBe(true);
    expect(deleteObject).toHaveBeenCalledWith(item?.image);
    const [edited] = (await getHomeTestimonials({ fresh: true })).chats;
    expect(edited?.image).toBe(replacement.slice('tmp/'.length));
  });

  it('keeps the edit when the old image cannot be removed', async () => {
    await chatStore.add(CHAT, tmp('chat'), ADMIN);
    const [item] = (await getHomeTestimonials({ fresh: true })).chats;
    deleteObject.mockRejectedValueOnce(new Error('gone'));
    expect((await chatStore.edit(item?.id ?? '', CHAT, tmp('chat'), ADMIN)).ok).toBe(true);
  });

  it('answers clearly for an item that is gone, or bad edits', async () => {
    expect(await chatStore.edit('Missing12345', CHAT, null, ADMIN)).toMatchObject({ ok: false });
    expect(await chatStore.remove('Missing12345', ADMIN)).toMatchObject({ ok: false });
    expect(await chatStore.move('Missing12345', 'up', ADMIN)).toMatchObject({ ok: false });
    await chatStore.add(CHAT, tmp('chat'), ADMIN);
    const [item] = (await getHomeTestimonials({ fresh: true })).chats;
    const id = item?.id ?? '';
    expect((await chatStore.edit(id, { ...CHAT, app: 'sms' }, null, ADMIN)).ok).toBe(false);
    expect((await chatStore.edit(id, CHAT, tmp('review'), ADMIN)).ok).toBe(false);
  });

  it('moves items, and leaves the ends alone', async () => {
    await chatStore.add({ ...CHAT, message: 'A' }, tmp('chat'), ADMIN);
    await chatStore.add({ ...CHAT, message: 'B' }, tmp('chat'), ADMIN);
    const [a, b] = (await getHomeTestimonials({ fresh: true })).chats;

    expect((await chatStore.move(a?.id ?? '', 'up', ADMIN)).message).toContain('already');
    await chatStore.move(b?.id ?? '', 'up', ADMIN);
    const order = (await getHomeTestimonials({ fresh: true })).chats.map((c) => c.message);
    expect(order).toEqual(['B', 'A']);
  });

  it('removes softly, so the record stays', async () => {
    await chatStore.add(CHAT, tmp('chat'), ADMIN);
    const [item] = (await getHomeTestimonials({ fresh: true })).chats;
    expect((await chatStore.remove(item?.id ?? '', ADMIN)).ok).toBe(true);
    expect((await getHomeTestimonials({ fresh: true })).chats).toHaveLength(0);
    expect(tables.get('homeChats')?.get(item?.id ?? '')).toBeDefined();
  });

  it('creates, changes and hides the banner line', async () => {
    expect((await saveBanner({ headline: 'Loved by 500+ happy couples' }, ADMIN)).ok).toBe(true);
    expect((await getHomeTestimonials({ fresh: true })).headline).toBe(
      'Loved by 500+ happy couples',
    );
    expect((await saveBanner({ headline: '' }, ADMIN)).message).toContain('hidden');
    expect((await getHomeTestimonials({ fresh: true })).headline).toBe('');
    expect((await saveBanner({ headline: 'x'.repeat(81) }, ADMIN)).ok).toBe(false);
  });

  it('finds an image path for the image route, and reads the image', async () => {
    await reviewStore.add(REVIEW, tmp('review'), ADMIN);
    const [review] = (await getHomeTestimonials({ fresh: true })).reviews;
    expect(await service.getTestimonialImagePath('review', review?.id ?? '')).toBe(review?.image);
    expect(await service.getTestimonialImagePath('chat', review?.id ?? '')).toBeNull();
    expect(await service.readTestimonialImage('a/b/c.webp')).toEqual({
      bytes: Buffer.from('img'),
      contentType: 'image/webp',
    });
    expect(service.storeFor('chat')).toBe(chatStore);
  });
});

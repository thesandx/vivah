// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const finalizeUpload = vi.fn();
const deleteObject = vi.fn();
const createSignedUploadUrl = vi.fn();
vi.mock('@/services/storage.service', () => ({
  finalizeUpload: (...args: unknown[]) => finalizeUpload(...args),
  deleteObject: (...args: unknown[]) => deleteObject(...args),
  createSignedUploadUrl: (...args: unknown[]) => createSignedUploadUrl(...args),
}));
vi.mock('@/services/storage.client', () => ({ getBucket: vi.fn() }));

const recordAdminActionIn = vi.fn();
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminActionIn: (...args: unknown[]) => recordAdminActionIn(...args),
}));

/** The one stored document, or null before the first upload. */
let stored: Record<string, string | null> | null = null;
const writes: Array<{ kind: string; payload: Record<string, unknown> }> = [];
vi.mock('@/services/repository', () => ({
  createRepository: () => ({
    get: async () => stored,
    runTransaction: async (
      fn: (repo: unknown, tx: unknown) => Promise<unknown>,
    ): Promise<unknown> =>
      fn(
        {
          get: async () => stored,
          createWithId: (_id: string, payload: Record<string, unknown>) =>
            writes.push({ kind: 'create', payload }),
          update: (_id: string, payload: Record<string, unknown>) =>
            writes.push({ kind: 'update', payload }),
        },
        {},
      ),
  }),
}));

const {
  createStepImageUpload,
  getStepImages,
  resetStepImage,
  resetStepImagesCache,
  saveStepImage,
} = await import('@/services/site-content.service');

const FOLDER = 'siteContent/how-it-works-steps';

describe('site content: How it works images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = null;
    writes.length = 0;
    resetStepImagesCache();
  });

  it('reads all placeholders before anything is uploaded, then caches', async () => {
    expect(await getStepImages()).toEqual({ step1: null, step2: null, step3: null });
    stored = { step1: `${FOLDER}/step-1-a.webp`, step2: null, step3: null };
    expect((await getStepImages()).step1).toBeNull();
    expect((await getStepImages({ fresh: true })).step1).toBe(`${FOLDER}/step-1-a.webp`);
  });

  it('signs an upload named for its step, and refuses an SVG', async () => {
    createSignedUploadUrl.mockResolvedValue({ url: 'u', tmpPath: 't', headers: {} });
    await createStepImageUpload(2, 'image/webp');
    const request = createSignedUploadUrl.mock.calls[0]?.[0] as {
      path: { collection: string; docId: string; filename: string };
    };
    expect(request.path.collection).toBe('siteContent');
    expect(request.path.docId).toBe('how-it-works-steps');
    expect(request.path.filename).toMatch(/^step-2-[A-Za-z0-9]+\.webp$/);
    await expect(createStepImageUpload(2, 'image/svg+xml')).rejects.toThrow();
  });

  it.each([
    `${FOLDER}/step-1-abc.webp`,
    `tmp/${FOLDER}/step-2-abc.webp`,
    'tmp/examples/doc/step-1-abc.webp',
    'tmp/siteContent/other-doc-id-here/step-1-abc.webp',
  ])('refuses an upload that is not a pending step 1 image: %s', async (tmpPath) => {
    const result = await saveStepImage(1, tmpPath, 'admin-uid');
    expect(result.ok).toBe(false);
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('creates the document on the first upload and logs it', async () => {
    finalizeUpload.mockResolvedValue({ path: `${FOLDER}/step-1-abc.webp` });
    const result = await saveStepImage(1, `tmp/${FOLDER}/step-1-abc.webp`, 'admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([
      {
        kind: 'create',
        payload: { step1: `${FOLDER}/step-1-abc.webp`, step2: null, step3: null },
      },
    ]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'home-image-changed', targetType: 'site' }),
    );
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('replaces an image and removes the old file afterwards', async () => {
    stored = { step1: null, step2: `${FOLDER}/step-2-old.webp`, step3: null };
    finalizeUpload.mockResolvedValue({ path: `${FOLDER}/step-2-new.webp` });
    await saveStepImage(2, `tmp/${FOLDER}/step-2-new.webp`, 'admin-uid');
    expect(writes).toEqual([{ kind: 'update', payload: { step2: `${FOLDER}/step-2-new.webp` } }]);
    expect(deleteObject).toHaveBeenCalledWith(`${FOLDER}/step-2-old.webp`);
  });

  it('puts the placeholder back, and a failed cleanup does not fail it', async () => {
    stored = { step1: null, step2: null, step3: `${FOLDER}/step-3-old.png` };
    deleteObject.mockRejectedValue(new Error('bucket blip'));
    const result = await resetStepImage(3, 'admin-uid');
    expect(result.ok).toBe(true);
    expect(writes).toEqual([{ kind: 'update', payload: { step3: null } }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'home-image-reset' }),
    );
  });
});

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const finalizeUpload = vi.fn();
const createSignedUploadUrl = vi.fn();
const createSignedReadUrl = vi.fn();
vi.mock('@/services/storage.service', () => ({
  finalizeUpload: (...args: unknown[]) => finalizeUpload(...args),
  createSignedUploadUrl: (...args: unknown[]) => createSignedUploadUrl(...args),
  createSignedReadUrl: (...args: unknown[]) => createSignedReadUrl(...args),
}));

const recordAdminActionIn = vi.fn();
vi.mock('@/services/admin-audit.service', () => ({
  recordAdminActionIn: (...args: unknown[]) => recordAdminActionIn(...args),
}));

/** The one stored document, or null before the first upload. */
let stored: Record<string, unknown> | null = null;
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
  createDemoVideoUpload,
  demoReadUrl,
  getDemoVideoUrls,
  removeDemoVideo,
  resetDemoVideoCache,
  saveDemoVideo,
} = await import('@/services/demo-video.service');

const VIDEO_TMP = 'tmp/siteContent/demo-video/demo-video-abc.mp4';
const POSTER_TMP = 'tmp/siteContent/demo-video/demo-poster-abc.jpg';

describe('demo video', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = null;
    writes.length = 0;
    resetDemoVideoCache();
  });

  it('has nothing to play before an admin uploads a video', async () => {
    expect(await getDemoVideoUrls()).toBeNull();
    expect(createSignedReadUrl).not.toHaveBeenCalled();
  });

  it('signs long-lived URLs for the video and the poster, and reuses them', async () => {
    stored = { file: 'demo-video-abc.mp4', poster: 'demo-poster-abc.jpg' };
    createSignedReadUrl.mockImplementation(async (path: string) => `https://storage.test/${path}`);
    const urls = await getDemoVideoUrls();
    expect(urls).toEqual({
      src: 'https://storage.test/siteContent/demo-video/demo-video-abc.mp4',
      fallbackSrc: '/api/demo-video/demo-video-abc.mp4',
      poster: 'https://storage.test/siteContent/demo-video/demo-poster-abc.jpg',
    });
    // Hours, not the 15-minute default.
    expect(createSignedReadUrl.mock.calls[0]?.[1]).toBeGreaterThan(60 * 60 * 1000);
    await getDemoVideoUrls();
    expect(createSignedReadUrl).toHaveBeenCalledTimes(2);
  });

  it('plays without a poster when there is none', async () => {
    stored = { file: 'demo-video-abc.mp4', poster: null };
    createSignedReadUrl.mockResolvedValue('https://storage.test/v');
    expect((await getDemoVideoUrls())?.poster).toBe('');
  });

  it('signs a short read URL only for a demo file in the demo folder', async () => {
    createSignedReadUrl.mockResolvedValue('https://storage.test/signed');
    expect(await demoReadUrl('demo-video-abc.mp4')).toBe('https://storage.test/signed');
    expect(createSignedReadUrl).toHaveBeenCalledWith('siteContent/demo-video/demo-video-abc.mp4');
    expect(await demoReadUrl('song-1-abc.mp3')).toBeNull();
    expect(await demoReadUrl('../users/x.jpg')).toBeNull();
    expect(createSignedReadUrl).toHaveBeenCalledTimes(1);
  });

  it('signs an upload only for an MP4 video or a JPEG poster', async () => {
    createSignedUploadUrl.mockResolvedValue({ url: 'u', tmpPath: 't', headers: {} });
    await createDemoVideoUpload('video', 'video/mp4');
    const request = createSignedUploadUrl.mock.calls[0]?.[0] as {
      path: { filename: string };
      maxBytes: number;
    };
    expect(request.path.filename).toMatch(/^demo-video-[A-Za-z0-9]+\.mp4$/);
    await createDemoVideoUpload('poster', 'image/jpeg');
    await expect(createDemoVideoUpload('video', 'video/quicktime')).rejects.toThrow();
    await expect(createDemoVideoUpload('poster', 'video/mp4')).rejects.toThrow();
  });

  it('saves a new video and poster, and writes the audit log', async () => {
    const result = await saveDemoVideo(VIDEO_TMP, POSTER_TMP, 'admin');
    expect(result.ok).toBe(true);
    expect(finalizeUpload).toHaveBeenCalledTimes(2);
    expect(writes).toEqual([
      { kind: 'create', payload: { file: 'demo-video-abc.mp4', poster: 'demo-poster-abc.jpg' } },
    ]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'demo-video-changed' }),
    );
  });

  it('refuses an upload from another folder, or a poster in place of the video', async () => {
    expect((await saveDemoVideo('tmp/siteContent/other/demo-video-a.mp4', null, 'a')).ok).toBe(
      false,
    );
    expect((await saveDemoVideo(POSTER_TMP, null, 'a')).ok).toBe(false);
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('saves a video without a poster', async () => {
    stored = { file: 'demo-video-old.mp4', poster: 'demo-poster-old.jpg' };
    expect((await saveDemoVideo(VIDEO_TMP, null, 'a')).ok).toBe(true);
    expect(writes).toEqual([
      { kind: 'update', payload: { file: 'demo-video-abc.mp4', poster: null } },
    ]);
  });

  it('takes the video off the home page and keeps the files', async () => {
    stored = { file: 'demo-video-abc.mp4', poster: null };
    expect((await removeDemoVideo('a')).ok).toBe(true);
    expect(writes).toEqual([{ kind: 'update', payload: { file: null, poster: null } }]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'demo-video-removed' }),
    );
  });
});

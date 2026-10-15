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

/** The one stored document, or null before the first song. */
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
  createSongUpload,
  listSongOptions,
  removeSong,
  resetSongsCache,
  saveSong,
  songInSlot,
  songReadUrl,
} = await import('@/services/wedding-songs.service');

const KESARIYA = { name: 'Kesariya', file: 'song-1-abc.mp3' };

describe('wedding songs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = null;
    writes.length = 0;
    resetSongsCache();
  });

  it('lists the filled slots in order, with a URL to play each', async () => {
    stored = {
      slot1: KESARIYA,
      slot2: null,
      slot3: { name: 'Tum Hi Ho', file: 'song-3-d.m4a' },
      slot4: null,
    };
    expect(await listSongOptions()).toEqual([
      { slot: 1, name: 'Kesariya', src: '/api/songs/song-1-abc.mp3' },
      { slot: 3, name: 'Tum Hi Ho', src: '/api/songs/song-3-d.m4a' },
    ]);
    expect(await songInSlot(2)).toBeNull();
    expect(await songInSlot(1)).toEqual(KESARIYA);
  });

  it('lists nothing before an admin adds a song', async () => {
    expect(await listSongOptions()).toEqual([]);
  });

  it('signs a read URL only for a song file in the songs folder', async () => {
    createSignedReadUrl.mockResolvedValue('https://storage.test/signed');
    expect(await songReadUrl('song-1-abc.mp3')).toBe('https://storage.test/signed');
    expect(createSignedReadUrl).toHaveBeenCalledWith('siteContent/wedding-songs/song-1-abc.mp3');
    expect(await songReadUrl('../users/x.jpg')).toBeNull();
    expect(await songReadUrl('step-1-abc.webp')).toBeNull();
    expect(createSignedReadUrl).toHaveBeenCalledTimes(1);
  });

  it('signs an upload only for an audio type', async () => {
    createSignedUploadUrl.mockResolvedValue({ url: 'u', tmpPath: 't', headers: {} });
    await createSongUpload(2, 'audio/mpeg');
    const request = createSignedUploadUrl.mock.calls[0]?.[0] as { path: { filename: string } };
    expect(request.path.filename).toMatch(/^song-2-[A-Za-z0-9]+\.mp3$/);
    await expect(createSongUpload(2, 'image/png')).rejects.toThrow();
  });

  it('saves a new upload with its name, and writes the audit log', async () => {
    const result = await saveSong(
      1,
      ' Kesariya ',
      'tmp/siteContent/wedding-songs/song-1-abc.mp3',
      'admin',
    );
    expect(result.ok).toBe(true);
    expect(finalizeUpload).toHaveBeenCalled();
    expect(writes).toEqual([
      { kind: 'create', payload: { slot1: KESARIYA, slot2: null, slot3: null, slot4: null } },
    ]);
    expect(recordAdminActionIn).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ action: 'song-changed' }),
    );
  });

  it('refuses an upload made for another slot or folder', async () => {
    expect(
      (await saveSong(2, 'Kesariya', 'tmp/siteContent/wedding-songs/song-1-abc.mp3', 'a')).ok,
    ).toBe(false);
    expect((await saveSong(1, 'Kesariya', 'tmp/siteContent/other/song-1-abc.mp3', 'a')).ok).toBe(
      false,
    );
    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('renames a song without a new file, but needs a file for an empty slot', async () => {
    expect((await saveSong(1, 'Kesariya', null, 'a')).ok).toBe(false);
    stored = { slot1: KESARIYA, slot2: null, slot3: null, slot4: null };
    expect((await saveSong(1, 'Kesariya (Reprise)', null, 'a')).ok).toBe(true);
    expect(writes).toEqual([
      {
        kind: 'update',
        payload: { slot1: { name: 'Kesariya (Reprise)', file: 'song-1-abc.mp3' } },
      },
    ]);
    expect((await saveSong(1, '  ', null, 'a')).ok).toBe(false);
  });

  it('empties a slot and keeps the file', async () => {
    stored = { slot1: KESARIYA, slot2: null, slot3: null, slot4: null };
    expect((await removeSong(1, 'a')).ok).toBe(true);
    expect(writes).toEqual([{ kind: 'update', payload: { slot1: null } }]);
  });
});

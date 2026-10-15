// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const listSongOptions = vi.fn();
vi.mock('@/services/wedding-songs.service', () => ({
  listSongOptions: () => listSongOptions(),
}));

const { GET } = await import('./route');

describe('GET /api/songs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the songs, kept for a minute', async () => {
    const songs = [{ slot: 1, name: 'Kesariya', src: '/api/songs/song-1-abc.mp3' }];
    listSongOptions.mockResolvedValue(songs);
    const response = await GET();
    expect(await response.json()).toEqual({ songs });
    expect(response.headers.get('Cache-Control')).toContain('max-age=60');
  });

  it('answers an empty list when the read fails, so the card skips the step', async () => {
    listSongOptions.mockRejectedValue(new Error('Firestore is down'));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ songs: [] });
  });
});

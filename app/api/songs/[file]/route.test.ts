// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const songReadUrl = vi.fn();
vi.mock('@/services/wedding-songs.service', () => ({
  songReadUrl: (file: string) => songReadUrl(file),
}));

const { GET } = await import('./route');

function get(file: string): Promise<Response> {
  return GET(new Request(`https://vivah.online/api/songs/${file}`), {
    params: Promise.resolve({ file }),
  });
}

describe('GET /api/songs/<file>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the browser to a signed bucket URL', async () => {
    songReadUrl.mockResolvedValue('https://storage.test/signed');
    const response = await get('song-1-abc.mp3');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://storage.test/signed');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=600');
  });

  it('answers 404 for a name that is not a song', async () => {
    songReadUrl.mockResolvedValue(null);
    expect((await get('secret.pdf')).status).toBe(404);
  });

  it('answers 503 when signing fails', async () => {
    songReadUrl.mockRejectedValue(new Error('IAM'));
    expect((await get('song-1-abc.mp3')).status).toBe(503);
  });
});

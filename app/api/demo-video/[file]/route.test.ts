// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const demoReadUrl = vi.fn();
vi.mock('@/services/demo-video.service', () => ({
  demoReadUrl: (file: string) => demoReadUrl(file),
}));

const { GET } = await import('./route');

function get(file: string): Promise<Response> {
  return GET(new Request(`https://vivah.online/api/demo-video/${file}`), {
    params: Promise.resolve({ file }),
  });
}

describe('GET /api/demo-video/<file>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the browser to a signed bucket URL', async () => {
    demoReadUrl.mockResolvedValue('https://storage.test/signed');
    const response = await get('demo-video-abc.mp4');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://storage.test/signed');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=600');
  });

  it('answers 404 for a name that is not a demo file', async () => {
    demoReadUrl.mockResolvedValue(null);
    expect((await get('secret.pdf')).status).toBe(404);
  });

  it('answers 503 when signing fails', async () => {
    demoReadUrl.mockRejectedValue(new Error('IAM'));
    expect((await get('demo-video-abc.mp4')).status).toBe(503);
  });
});

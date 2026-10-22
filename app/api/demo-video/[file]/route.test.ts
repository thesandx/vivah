// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const demoReadUrl = vi.fn();
vi.mock('@/services/demo-video.service', () => ({
  demoReadUrl: (file: string, slot: string) => demoReadUrl(file, slot),
}));

const { GET } = await import('./route');

function get(file: string, query = ''): Promise<Response> {
  return GET(new Request(`https://vivah.online/api/demo-video/${file}${query}`), {
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

  it('signs in the demo folder by default, and in a help slot when named', async () => {
    demoReadUrl.mockResolvedValue('https://storage.test/signed');
    await get('demo-video-abc.mp4');
    expect(demoReadUrl).toHaveBeenLastCalledWith('demo-video-abc.mp4', 'demo');
    await get('demo-video-abc.mp4', '?slot=help-edit-details');
    expect(demoReadUrl).toHaveBeenLastCalledWith('demo-video-abc.mp4', 'help-edit-details');
  });

  it('answers 404 for a slot that does not exist', async () => {
    expect((await get('demo-video-abc.mp4', '?slot=users')).status).toBe(404);
    expect(demoReadUrl).not.toHaveBeenCalled();
  });
});

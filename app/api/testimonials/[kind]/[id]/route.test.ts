// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTestimonialImagePath = vi.fn();
const readTestimonialImage = vi.fn();
vi.mock('@/services/testimonials.service', () => ({
  getTestimonialImagePath: (...args: unknown[]) => getTestimonialImagePath(...args),
  readTestimonialImage: (...args: unknown[]) => readTestimonialImage(...args),
}));

const { GET } = await import('./route');

const ID = 'AbCdEf1234567890XyZ1';
const PATH = 'siteContent/home-chats/chat-abc123.webp';

function get(kind: string, id: string, query = ''): Promise<Response> {
  return GET(new Request(`https://vivah.online/api/testimonials/${kind}/${id}${query}`), {
    params: Promise.resolve({ kind, id }),
  });
}

describe('GET /api/testimonials/<kind>/<id>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTestimonialImagePath.mockResolvedValue(PATH);
    readTestimonialImage.mockResolvedValue({
      bytes: Buffer.from('image'),
      contentType: 'image/webp',
    });
  });

  it('answers 404 for an unknown kind or a malformed id, without reading', async () => {
    expect((await get('step', ID)).status).toBe(404);
    expect((await get('chat', '..%2Fx')).status).toBe(404);
    expect(getTestimonialImagePath).not.toHaveBeenCalled();
  });

  it('answers 404 for a removed item', async () => {
    getTestimonialImagePath.mockResolvedValue(null);
    expect((await get('chat', ID)).status).toBe(404);
  });

  it('keeps the image for a year when the URL names this version', async () => {
    const response = await get('chat', ID, '?v=abc123');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
  });

  it('keeps it for five minutes only when the version is old', async () => {
    const response = await get('chat', ID, '?v=old');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('answers 503, not cached, when the bucket fails', async () => {
    readTestimonialImage.mockRejectedValue(new Error('down'));
    const response = await get('review', ID);
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getStepImages = vi.fn();
const readStepImage = vi.fn();
vi.mock('@/services/site-content.service', () => ({
  getStepImages: (...args: unknown[]) => getStepImages(...args),
  readStepImage: (...args: unknown[]) => readStepImage(...args),
}));

const { GET } = await import('./route');

function get(step: string): Promise<Response> {
  return GET(new Request(`https://vivah.online/api/how-it-works/${step}`), {
    params: Promise.resolve({ step }),
  });
}

describe('GET /api/how-it-works/<step>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStepImages.mockResolvedValue({ step1: null, step2: null, step3: null });
  });

  it('answers 404 for a step that does not exist', async () => {
    const response = await get('4');
    expect(response.status).toBe(404);
    expect(getStepImages).not.toHaveBeenCalled();
  });

  it('sends the browser to the placeholder until an admin uploads an image', async () => {
    const response = await get('2');
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/how-it-works/step-2.webp');
    expect(response.headers.get('Cache-Control')).toContain('max-age=300');
  });

  it('serves the uploaded image', async () => {
    const path = 'siteContent/how-it-works-steps/step-1-abc.webp';
    getStepImages.mockResolvedValue({ step1: path, step2: null, step3: null });
    readStepImage.mockResolvedValue({ bytes: Buffer.from('webp'), contentType: 'image/webp' });

    const response = await get('1');

    expect(readStepImage).toHaveBeenCalledWith(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('webp');
  });

  it('falls back to the placeholder, briefly cached, when the read fails', async () => {
    getStepImages.mockRejectedValue(new Error('Firestore is down'));
    const response = await get('3');
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('/how-it-works/step-3.webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });
});

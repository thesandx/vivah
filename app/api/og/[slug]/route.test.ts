// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWeddingBySlug = vi.fn();
vi.mock('@/services/wedding.service', () => ({
  getWeddingBySlug: (slug: string) => getWeddingBySlug(slug),
}));

const { GET } = await import('./route');

function get(slug: string, query = ''): Promise<Response> {
  return GET(new Request(`https://anushka.vivah.online/api/og/${slug}${query}`), {
    params: Promise.resolve({ slug }),
  });
}

const wedding = {
  slug: 'anushka',
  bride: 'Anushka',
  groom: 'Sandeep',
  weddingDate: '2026-12-30',
  status: 'published',
};

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe('GET /api/og/<slug>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('draws a portrait card small enough for a large WhatsApp preview', async () => {
    getWeddingBySlug.mockResolvedValue(wedding);
    const response = await get('anushka', '?guest=Sandeep');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(pngSize(bytes)).toEqual({ width: 1080, height: 1350 });
    // WhatsApp falls back to a small thumbnail above about 300 KB.
    expect(bytes.byteLength).toBeLessThan(300_000);
  });

  it('still draws a card for long names and no date', async () => {
    getWeddingBySlug.mockResolvedValue({
      ...wedding,
      bride: 'Venkatalakshmi',
      groom: 'Siddharth',
      weddingDate: null,
    });
    expect((await get('anushka')).status).toBe(200);
  });

  it('answers 404 for an unavailable invite', async () => {
    getWeddingBySlug.mockResolvedValue({ ...wedding, status: 'unavailable' });
    expect((await get('anushka')).status).toBe(404);
  });

  it('draws the sample invite, which has no wedding document', async () => {
    getWeddingBySlug.mockResolvedValue(null);
    expect((await get('priya-rahul')).status).toBe(200);
    expect((await get('anushka')).status).toBe(404);
  });

  it('answers 500 when the wedding cannot be read', async () => {
    getWeddingBySlug.mockRejectedValue(new Error('Firestore'));
    expect((await get('anushka')).status).toBe(500);
  });
});

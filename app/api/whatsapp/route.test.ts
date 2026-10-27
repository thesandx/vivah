// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

const getWhatsAppHello = vi.fn();
vi.mock('@/services/whatsapp-hello.service', () => ({
  getWhatsAppHello: () => getWhatsAppHello(),
}));

const { GET } = await import('./route');

describe('GET /api/whatsapp', () => {
  it('redirects to a chat with our number and the saved message typed in', async () => {
    getWhatsAppHello.mockResolvedValue('Hi Vivah team! 🙏');
    const response = await GET();
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      `https://wa.me/919546342507?text=${encodeURIComponent('Hi Vivah team! 🙏')}`,
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

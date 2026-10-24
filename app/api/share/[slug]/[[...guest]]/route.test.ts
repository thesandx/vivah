// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LinkPreviewCard } from '@/lib/link-preview-page';

const coupleInviteCard =
  vi.fn<(slug: string, guest: string | null) => Promise<LinkPreviewCard | null>>();

vi.mock('@/app/(invite)/site/[slug]/couple-invite', () => ({
  coupleInviteCard: (slug: string, guest: string | null) => coupleInviteCard(slug, guest),
}));

const { GET } = await import('./route');

function get(slug: string, guest?: string[]): Promise<Response> {
  return GET(new Request(`http://0.0.0.0:8080/api/share/${slug}`), {
    params: Promise.resolve({ slug, ...(guest !== undefined && { guest }) }),
  });
}

const CARD: LinkPreviewCard = {
  title: 'Radha & Shyam',
  description: 'Hi Neha',
  url: 'https://radha-shyam.vivah.online/Neha',
  siteName: 'vivah.online',
  image: {
    url: 'https://radha-shyam.vivah.online/api/og/radha-shyam?guest=Neha',
    width: 1080,
    height: 1350,
    alt: 'x',
  },
};

describe('GET /api/share/[slug]/[[...guest]]', () => {
  beforeEach(() => vi.clearAllMocks());

  it("answers a guest's link with the card", async () => {
    coupleInviteCard.mockResolvedValue(CARD);
    const response = await get('radha-shyam', ['Neha']);
    expect(coupleInviteCard).toHaveBeenCalledWith('radha-shyam', 'Neha');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      'og:image" content="https://radha-shyam.vivah.online/api/og/',
    );
  });

  it('reads the plain link with no guest', async () => {
    coupleInviteCard.mockResolvedValue(CARD);
    await get('radha-shyam');
    expect(coupleInviteCard).toHaveBeenCalledWith('radha-shyam', null);
  });

  it('answers 404 for no invite, or a path deeper than one guest', async () => {
    coupleInviteCard.mockResolvedValue(null);
    expect((await get('nobody')).status).toBe(404);
    expect((await get('radha-shyam', ['a', 'b'])).status).toBe(404);
  });

  it('answers 503 when the read fails', async () => {
    coupleInviteCard.mockRejectedValue(new Error('UNAVAILABLE'));
    expect((await get('radha-shyam', ['Neha'])).status).toBe(503);
  });
});

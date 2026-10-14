// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const openPreviewLink =
  vi.fn<
    (id: string, token: string | undefined) => Promise<{ access: string; newToken: string | null }>
  >();
const cookieValue = vi.fn<() => string | undefined>();

vi.mock('@/services/lead.service', () => ({
  openPreviewLink: (id: string, token: string | undefined) => openPreviewLink(id, token),
}));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => {
        const value = cookieValue();
        return value === undefined ? undefined : { value };
      },
    }),
}));

const { GET } = await import('./route');

const ID = 'AbCdEfGhIjKlMnOpQrSt';

function open(): Promise<Response> {
  return GET(new Request(`http://localhost/p/${ID}`), { params: Promise.resolve({ id: ID }) });
}

describe('GET /p/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValue.mockReturnValue(undefined);
  });

  it('binds the first browser with a cookie and redirects to the preview', async () => {
    openPreviewLink.mockResolvedValue({ access: 'ok', newToken: 'fresh-token' });
    const response = await open();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost/preview/${ID}`);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('vivah_preview=fresh-token');
    expect(cookie).toContain(`Path=/preview/${ID}`);
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('sets no cookie on a later visit', async () => {
    cookieValue.mockReturnValue('old-token');
    openPreviewLink.mockResolvedValue({ access: 'ok', newToken: null });
    const response = await open();
    expect(openPreviewLink).toHaveBeenCalledWith(ID, 'old-token');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('still redirects when the database fails, so the page can show the error', async () => {
    openPreviewLink.mockRejectedValue(new Error('UNAVAILABLE'));
    const response = await open();
    expect(response.status).toBe(303);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

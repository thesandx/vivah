// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The new-preview notice, with `fetch` replaced by a fake. The rules under
 * test: nothing is sent while notices are off, the text never holds a phone
 * number, and no failure escapes as a thrown error.
 */

const telegram = { enabled: true, botToken: '123456:secret-token', chatId: '987654321' };
vi.mock('@/lib/env', () => ({
  env: { telegram, rootDomain: 'vivah.online', appUrl: 'http://localhost:3000' },
}));

const logged = { info: vi.fn(), error: vi.fn() };
vi.mock('@/lib/logger', () => ({ logger: logged }));

const { newLeadText, notifyNewLead } = await import('./telegram.service');

const NOTICE = {
  leadId: 'AbCdEfGhIjKlMnOpQrSt',
  coupleNames: 'Riya & Aman',
  weddingDate: '2027-02-12',
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  telegram.enabled = true;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('newLeadText', () => {
  it('names the couple and the date, and links the admin page', () => {
    const text = newLeadText(NOTICE);
    expect(text).toContain('New preview: Riya & Aman');
    expect(text).toContain('2027');
    expect(text).toContain('https://vivah.online/admin/previews/AbCdEfGhIjKlMnOpQrSt');
  });
});

describe('notifyNewLead', () => {
  it('sends nothing while notices are off', async () => {
    telegram.enabled = false;
    expect(await notifyNewLead(NOTICE)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the text to the chat, under a timeout', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    expect(await notifyNewLead(NOTICE)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.telegram.org/bot123456:secret-token/sendMessage');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      chat_id: '987654321',
      text: newLeadText(NOTICE),
    });
  });

  it('answers false and never logs the token when Telegram refuses', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, description: 'Not Found' }, { status: 404 }),
    );
    expect(await notifyNewLead(NOTICE)).toBe(false);
    expect(logged.error).toHaveBeenCalledWith(
      'Telegram refused the new preview notice',
      undefined,
      expect.objectContaining({ status: 404, leadId: NOTICE.leadId }),
    );
    expect(JSON.stringify(logged.error.mock.calls)).not.toContain('secret-token');
  });

  it('answers false, and does not throw, when the network fails', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    expect(await notifyNewLead(NOTICE)).toBe(false);
  });
});

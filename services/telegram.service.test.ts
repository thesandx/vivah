// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The new-preview notice, with `fetch` replaced by a fake. The rules under
 * test: nothing is sent while notices are off, three messages go in order,
 * the logs never hold the token or the number, and no failure escapes as a
 * thrown error.
 */

const telegram = { enabled: true, botToken: '123456:secret-token', chatId: '987654321' };
vi.mock('@/lib/env', () => ({
  env: { telegram, rootDomain: 'vivah.online', appUrl: 'http://localhost:3000' },
}));

const logged = { info: vi.fn(), error: vi.fn() };
vi.mock('@/lib/logger', () => ({ logger: logged }));

const { newLeadMessages, notifyNewLead } = await import('./telegram.service');

const NOTICE = {
  leadId: 'AbCdEfGhIjKlMnOpQrSt',
  bride: 'Riya',
  groom: 'Aman',
  weddingDate: '2027-02-12',
  slug: 'riya-aman',
  phoneE164: '+919876543210',
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

describe('newLeadMessages', () => {
  it('builds the alert, the message for the couple, and the bare number', () => {
    const [alert, forCouple, phone] = newLeadMessages(NOTICE);
    expect(alert).toContain('New preview: Riya & Aman');
    expect(alert).toContain('2027');
    expect(alert).toContain('https://vivah.online/admin/previews/AbCdEfGhIjKlMnOpQrSt');
    expect(forCouple).toContain('Namaste Riya & Aman');
    expect(forCouple).toContain('https://vivah.online/p/AbCdEfGhIjKlMnOpQrSt');
    expect(forCouple).toContain('30 minutes');
    expect(forCouple).toContain('riya-aman.vivah.online');
    expect(forCouple).not.toContain('9876543210');
    expect(phone).toBe('+919876543210');
  });

  it('names no address when the couple chose none', () => {
    const [, forCouple] = newLeadMessages({ ...NOTICE, slug: null });
    expect(forCouple).toContain('your own vivah.online link');
  });
});

describe('notifyNewLead', () => {
  it('sends nothing while notices are off', async () => {
    telegram.enabled = false;
    expect(await notifyNewLead(NOTICE)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the three messages in order to the chat, under a timeout', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ ok: true })));
    expect(await notifyNewLead(NOTICE)).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const texts = fetchMock.mock.calls.map(([url, init]) => {
      expect(url).toBe('https://api.telegram.org/bot123456:secret-token/sendMessage');
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const body = JSON.parse(String(init?.body)) as { chat_id: string; text: string };
      expect(body.chat_id).toBe('987654321');
      return body.text;
    });
    expect(texts).toEqual(newLeadMessages(NOTICE));
  });

  it('stops, answers false and logs neither token nor number when Telegram refuses', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, description: 'Not Found' }, { status: 404 }),
    );
    expect(await notifyNewLead(NOTICE)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logged.error).toHaveBeenCalledWith(
      'Telegram refused the new preview notice',
      undefined,
      expect.objectContaining({ status: 404, leadId: NOTICE.leadId }),
    );
    const everything = JSON.stringify(logged.error.mock.calls);
    expect(everything).not.toContain('secret-token');
    expect(everything).not.toContain('9876543210');
  });

  it('answers false, and does not throw, when the network fails', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    expect(await notifyNewLead(NOTICE)).toBe(false);
  });
});

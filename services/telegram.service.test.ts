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

const {
  newLeadMessages,
  notifyNewLead,
  notifyPayment,
  notifyPaymentFailure,
  paymentFailureMessage,
  paymentMessages,
} = await import('./telegram.service');

const NOTICE = {
  leadId: 'AbCdEfGhIjKlMnOpQrSt',
  bride: 'Riya',
  groom: 'Aman',
  weddingDate: '2027-02-12',
  slug: 'riya-aman',
  phoneE164: '+919876543210',
  createdAt: new Date('2026-10-29T09:01:00Z'), // 2:31 pm in India
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
    expect(alert).toContain('Not paid by 2:41 pm (10 min)?');
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

  it('answers false and logs neither token nor number when Telegram refuses', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, description: 'Not Found' }, { status: 404 }),
    );
    expect(await notifyNewLead(NOTICE)).toBe(false);
    // A 404 will fail the same way again: no retry, one try per message.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(logged.error).toHaveBeenCalledWith(
      'Telegram did not take a message',
      undefined,
      expect.objectContaining({ status: 404, detail: 'Not Found', leadId: NOTICE.leadId }),
    );
    const everything = JSON.stringify([logged.error.mock.calls, logged.info.mock.calls]);
    expect(everything).not.toContain('secret-token');
    expect(everything).not.toContain('9876543210');
  });

  it('answers false, and does not throw, when the network fails', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    expect(await notifyNewLead(NOTICE)).toBe(false);
    expect(logged.error).toHaveBeenCalledWith(
      'Telegram did not take a message',
      undefined,
      expect.objectContaining({ status: 'no answer', detail: 'TimeoutError' }),
    );
  });

  it('still sends the message for the couple and the number when the alert times out', async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'))
      .mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'))
      .mockResolvedValue(Response.json({ ok: true }));
    expect(await notifyNewLead(NOTICE)).toBe(false);
    const texts = fetchMock.mock.calls.map(([, init]) => {
      const body: unknown = JSON.parse(String(init?.body));
      return (body as { text: string }).text;
    });
    const [, forCouple, phone] = newLeadMessages(NOTICE);
    expect(texts.slice(2)).toEqual([forCouple, phone]);
  });

  it('retries a timed-out message once, then succeeds', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'));
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    expect(await notifyNewLead(NOTICE)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('starts no send after the sign-up budget is spent', async () => {
    // Each try takes 4 seconds of the 7-second budget, then times out.
    let clock = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock);
    fetchMock.mockImplementation(() => {
      clock += 4_000;
      return Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'));
    });
    try {
      expect(await notifyNewLead(NOTICE)).toBe(false);
    } finally {
      now.mockRestore();
    }
    // The alert and its retry; the other two are skipped and logged.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logged.error).toHaveBeenCalledWith(
      'Telegram message skipped: no time left',
      undefined,
      expect.objectContaining({ message: '3 of 3' }),
    );
  });
});

describe('payment notices', () => {
  const PAYMENT = {
    paymentId: 'PaYmEnTiDaBcDeFgHiJk',
    leadId: 'AbCdEfGhIjKlMnOpQrSt',
    slug: 'riya-aman',
    amountRupees: 499,
    bride: 'Riya',
    groom: 'Aman',
    phoneE164: '+919876543210',
  };

  it('sends the alert, the welcome message for the couple, and the bare number once live', () => {
    const [alert, forCouple, phone] = paymentMessages({ ...PAYMENT, kind: 'published' });
    expect(alert).toContain('Paid ₹499: Riya & Aman are live at riya-aman.vivah.online');
    expect(alert).toContain('https://vivah.online/admin/previews/AbCdEfGhIjKlMnOpQrSt');
    expect(forCouple).toContain('Congratulations Riya & Aman');
    expect(forCouple).toContain('https://riya-aman.vivah.online');
    expect(forCouple).toContain('https://vivah.online/dashboard');
    expect(forCouple).toContain('https://vivah.online/help');
    expect(forCouple).toContain('+91 98765 43210');
    expect(forCouple).toContain('support@vivah.online');
    expect(phone).toBe('+919876543210');
  });

  it('names the coupon in the alert, for a referral cashback', () => {
    const [alert] = paymentMessages({ ...PAYMENT, kind: 'published', couponCode: 'NEW20' });
    expect(alert).toContain('Coupon: NEW20');
    const [plain] = paymentMessages({ ...PAYMENT, kind: 'published' });
    expect(plain).not.toContain('Coupon');
  });

  it('sends the alert alone when nothing was published', () => {
    expect(paymentMessages({ ...PAYMENT, kind: 'address-taken' })).toEqual([
      expect.stringContaining('was taken'),
    ]);
    expect(paymentMessages({ ...PAYMENT, kind: 'duplicate' })).toEqual([
      expect.stringContaining('Refund it'),
    ]);
  });

  it('sends the three messages in order, and never throws', async () => {
    fetchMock.mockResolvedValue(new Response('{}'));
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    telegram.enabled = false;
    fetchMock.mockClear();
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    telegram.enabled = true;
    fetchMock.mockClear();
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(false);
  });

  it('retries a message that timed out once', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'));
    fetchMock.mockResolvedValue(new Response('{}'));
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('still sends the welcome text and the number when the alert fails', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new Response('{}'));
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(false);
    const texts = fetchMock.mock.calls.map(([, init]) => {
      const body: unknown = JSON.parse(String(init?.body));
      return (body as { text: string }).text;
    });
    expect(texts).toHaveLength(4);
    expect(texts[2]).toContain('Congratulations');
    expect(texts[3]).toBe(PAYMENT.phoneE164);
  });

  it('waits as Telegram asks after a 429, and does not retry a 400', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ ok: false, parameters: { retry_after: 0 } }, { status: 429 }),
      )
      .mockResolvedValueOnce(new Response('bad', { status: 400 }))
      .mockResolvedValue(new Response('{}'));
    expect(await notifyPayment({ ...PAYMENT, kind: 'published' })).toBe(false);
    // Alert: 429 then 400 (one retry, no more). Then the other two.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('names the Cashfree reason when a payment does not start', async () => {
    const failure = {
      paymentId: PAYMENT.paymentId,
      leadId: PAYMENT.leadId,
      environment: 'Cashfree production',
      detail: 'Cashfree creating a payment link failed (401): authentication Failed',
    };
    const text = paymentFailureMessage(failure);
    expect(text).toContain('Cashfree production');
    expect(text).toContain('authentication Failed');
    expect(text).toContain('https://vivah.online/admin/previews/AbCdEfGhIjKlMnOpQrSt');

    fetchMock.mockResolvedValue(new Response('{}'));
    fetchMock.mockClear();
    expect(await notifyPaymentFailure(failure)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never logs the number', async () => {
    fetchMock.mockResolvedValue(new Response('no', { status: 400 }));
    await notifyPayment({ ...PAYMENT, kind: 'published' });
    expect(JSON.stringify(logged.error.mock.calls)).not.toContain('9876543210');
  });
});

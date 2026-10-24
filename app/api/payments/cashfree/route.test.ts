// @vitest-environment node

import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The webhook, with the settling mocked: what matters here is that only a
 * correctly signed body reaches it, and that a failure asks Cashfree to retry.
 */

const cashfree = { enabled: true, secretKey: 'cfsk_ma_test_secret' };
vi.mock('@/lib/env', () => ({ env: { cashfree } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const completePayment = vi.fn<(id: string, orderId: string | null) => Promise<unknown>>();
vi.mock('@/services/payment.service', () => ({
  completePayment: (id: string, orderId: string | null) => completePayment(id, orderId),
}));

const { POST } = await import('./route');

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const BODY = JSON.stringify({
  data: {
    link_id: `vivah_${PAYMENT_ID}`,
    link_status: 'PAID',
    order: { order_id: 'CFPay_abc' },
  },
  type: 'PAYMENT_LINK_EVENT',
});

function webhook(body: string, signature?: string): Request {
  const timestamp = '1760770000000';
  return new Request('http://localhost/api/payments/cashfree', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-timestamp': timestamp,
      'x-webhook-signature':
        signature ??
        createHmac('sha256', cashfree.secretKey)
          .update(timestamp + body)
          .digest('base64'),
    },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cashfree.enabled = true;
  completePayment.mockResolvedValue({ state: 'published', leadId: 'x', slug: 'priya-rahul' });
});

describe('POST /api/payments/cashfree', () => {
  it('settles a signed event for one of our links', async () => {
    const response = await POST(webhook(BODY));
    expect(response.status).toBe(200);
    expect(completePayment).toHaveBeenCalledWith(PAYMENT_ID, 'CFPay_abc');
  });

  it('refuses a bad signature and changes nothing', async () => {
    const response = await POST(webhook(BODY, 'bm90LWEtc2lnbmF0dXJl'));
    expect(response.status).toBe(401);
    expect(completePayment).not.toHaveBeenCalled();
  });

  it('ignores a signed event for a link that is not ours', async () => {
    const body = BODY.replace(`vivah_${PAYMENT_ID}`, 'payment_ps11');
    const response = await POST(webhook(body));
    expect(response.status).toBe(200);
    expect(completePayment).not.toHaveBeenCalled();
  });

  it('asks Cashfree to retry when settling fails', async () => {
    completePayment.mockRejectedValue(new Error('Cashfree is down'));
    expect((await POST(webhook(BODY))).status).toBe(500);
  });

  it('answers 503 while payment is off', async () => {
    cashfree.enabled = false;
    expect((await POST(webhook(BODY))).status).toBe(503);
  });
});

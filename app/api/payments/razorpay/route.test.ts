// @vitest-environment node

import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The webhook, with the settling mocked: what matters here is that only a
 * correctly signed body reaches it, and that a failure asks Razorpay to retry.
 */

const razorpay = { enabled: true, webhookSecret: 'whsec_test_secret' };
vi.mock('@/lib/env', () => ({ env: { razorpay } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const completePayment = vi.fn<(id: string, orderId: string | null) => Promise<unknown>>();
vi.mock('@/services/payment.service', () => ({
  completePayment: (id: string, orderId: string | null) => completePayment(id, orderId),
}));

const { POST } = await import('./route');

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const BODY = JSON.stringify({
  entity: 'event',
  event: 'order.paid',
  payload: {
    order: { entity: { id: 'order_abc', receipt: `vivah_${PAYMENT_ID}`, status: 'paid' } },
    payment: { entity: { id: 'pay_abc', amount: 49900 } },
  },
});

function webhook(body: string, signature?: string): Request {
  return new Request('http://localhost/api/payments/razorpay', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature':
        signature ?? createHmac('sha256', razorpay.webhookSecret).update(body).digest('hex'),
    },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  razorpay.enabled = true;
  razorpay.webhookSecret = 'whsec_test_secret';
  completePayment.mockResolvedValue({ state: 'published', leadId: 'x', slug: 'priya-rahul' });
});

describe('POST /api/payments/razorpay', () => {
  it('settles a signed event for one of our orders', async () => {
    const response = await POST(webhook(BODY));
    expect(response.status).toBe(200);
    expect(completePayment).toHaveBeenCalledWith(PAYMENT_ID, 'pay_abc');
  });

  it('refuses a bad signature and changes nothing', async () => {
    const response = await POST(webhook(BODY, 'a'.repeat(64)));
    expect(response.status).toBe(401);
    expect(completePayment).not.toHaveBeenCalled();
  });

  it('ignores a signed event for an order that is not ours', async () => {
    const body = BODY.replace(`vivah_${PAYMENT_ID}`, 'order_ps11');
    const response = await POST(webhook(body));
    expect(response.status).toBe(200);
    expect(completePayment).not.toHaveBeenCalled();
  });

  it('asks Razorpay to retry when settling fails', async () => {
    completePayment.mockRejectedValue(new Error('Razorpay is down'));
    expect((await POST(webhook(BODY))).status).toBe(500);
  });

  it('answers 503 while Razorpay or its webhook secret is not set', async () => {
    razorpay.enabled = false;
    expect((await POST(webhook(BODY))).status).toBe(503);
    razorpay.enabled = true;
    razorpay.webhookSecret = '';
    expect((await POST(webhook(BODY))).status).toBe(503);
  });
});

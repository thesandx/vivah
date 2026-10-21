// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The checkout's answer, with the settling mocked: what matters here is the
 * input check and where each outcome sends the couple.
 */

const razorpay = { enabled: true };
vi.mock('@/lib/env', () => ({ env: { razorpay } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const confirm = vi.fn<(id: string, answer: unknown) => Promise<unknown>>();
const getPayment = vi.fn<(id: string) => Promise<unknown>>();
vi.mock('@/services/payment.service', () => ({
  confirmRazorpayCheckout: (id: string, answer: unknown) => confirm(id, answer),
  payments: { get: (id: string) => getPayment(id) },
}));

const { POST } = await import('./route');

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const ANSWER = {
  paymentId: PAYMENT_ID,
  razorpay_order_id: 'order_1',
  razorpay_payment_id: 'pay_1',
  razorpay_signature: 'a'.repeat(64),
};

function post(body: unknown): Request {
  return new Request('http://localhost/api/payments/razorpay/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  razorpay.enabled = true;
});

describe('POST /api/payments/razorpay/confirm', () => {
  it('sends a published couple to the success screen', async () => {
    confirm.mockResolvedValue({ state: 'published', leadId: 'lead1', slug: 'riya-arjun' });
    const response = await POST(post(ANSWER));
    expect(await response.json()).toEqual({ url: '/preview/lead1?payment=success' });
    expect(confirm).toHaveBeenCalledWith(PAYMENT_ID, {
      orderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      signature: 'a'.repeat(64),
    });
  });

  it('asks for another address when it went to another couple', async () => {
    confirm.mockResolvedValue({ state: 'address-taken', leadId: 'lead1' });
    expect(await (await POST(post(ANSWER))).json()).toEqual({
      url: '/preview/lead1?payment=choose',
    });
  });

  it('refuses a bad signature and a malformed body', async () => {
    confirm.mockResolvedValue({ state: 'bad-signature' });
    expect((await POST(post(ANSWER))).status).toBe(400);
    expect((await POST(post({ paymentId: 'x' }))).status).toBe(400);
  });

  it('says pending when Razorpay cannot be read', async () => {
    confirm.mockRejectedValue(new Error('Razorpay is down'));
    getPayment.mockResolvedValue({ leadId: 'lead1' });
    expect(await (await POST(post(ANSWER))).json()).toEqual({
      url: '/preview/lead1?payment=pending',
    });
  });

  it('answers 503 while Razorpay is off', async () => {
    razorpay.enabled = false;
    expect((await POST(post(ANSWER))).status).toBe(503);
  });
});

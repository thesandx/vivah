import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  parseRazorpayWebhook,
  paymentIdFromReferenceId,
  razorpayReferenceId,
  razorpaySignatureValid,
  toPaise,
} from '@/lib/razorpay';

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';

describe('razorpayReferenceId', () => {
  it('names the payment document, within 40 characters', () => {
    const id = razorpayReferenceId(PAYMENT_ID);
    expect(id).toBe(`vivah_${PAYMENT_ID}`);
    expect(id.length).toBeLessThanOrEqual(40);
    expect(paymentIdFromReferenceId(id)).toBe(PAYMENT_ID);
  });

  it('ignores a reference that is not ours', () => {
    expect(paymentIdFromReferenceId('order_123')).toBeNull();
  });
});

describe('toPaise', () => {
  it('counts rupees in paise', () => {
    expect(toPaise(499)).toBe(49_900);
    expect(toPaise(799.5)).toBe(79_950);
  });

  it('refuses less than one rupee', () => {
    expect(() => toPaise(0.5)).toThrow();
  });
});

describe('razorpaySignatureValid', () => {
  const secret = 'whsec_test';
  const body = '{"event":"payment_link.paid"}';
  const signed = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts the hex HMAC of the raw body', () => {
    expect(razorpaySignatureValid(body, signed, secret)).toBe(true);
  });

  it('refuses a changed body, another secret, or no signature', () => {
    expect(razorpaySignatureValid(`${body} `, signed, secret)).toBe(false);
    expect(razorpaySignatureValid(body, signed, 'other')).toBe(false);
    expect(razorpaySignatureValid(body, null, secret)).toBe(false);
    expect(razorpaySignatureValid(body, 'zz', secret)).toBe(false);
    expect(razorpaySignatureValid(body, signed, '')).toBe(false);
  });
});

describe('parseRazorpayWebhook', () => {
  it('reads the reference id and the payment id', () => {
    const body = JSON.stringify({
      event: 'payment_link.paid',
      payload: {
        payment_link: { entity: { id: 'plink_1', reference_id: `vivah_${PAYMENT_ID}` } },
        payment: { entity: { id: 'pay_1' } },
      },
    });
    expect(parseRazorpayWebhook(body)).toEqual({
      referenceId: `vivah_${PAYMENT_ID}`,
      razorpayPaymentId: 'pay_1',
    });
  });

  it('reads a link event with no payment in it', () => {
    const body = JSON.stringify({
      event: 'payment_link.expired',
      payload: { payment_link: { entity: { reference_id: 'vivah_x' } } },
    });
    expect(parseRazorpayWebhook(body)).toEqual({ referenceId: 'vivah_x', razorpayPaymentId: null });
  });

  it('ignores other events and bodies that are not JSON', () => {
    expect(parseRazorpayWebhook(JSON.stringify({ event: 'payment.captured' }))).toBeNull();
    expect(parseRazorpayWebhook('not json')).toBeNull();
    expect(parseRazorpayWebhook(JSON.stringify({ event: 'payment_link.paid' }))).toBeNull();
  });
});

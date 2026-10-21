import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  parseRazorpayWebhook,
  paymentIdFromReceipt,
  razorpayCheckoutSignatureValid,
  razorpayReceipt,
  razorpaySignatureValid,
  toPaise,
} from '@/lib/razorpay';

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';

describe('razorpayReceipt', () => {
  it('names the payment document, within 40 characters', () => {
    const receipt = razorpayReceipt(PAYMENT_ID);
    expect(receipt).toBe(`vivah_${PAYMENT_ID}`);
    expect(receipt.length).toBeLessThanOrEqual(40);
    expect(paymentIdFromReceipt(receipt)).toBe(PAYMENT_ID);
  });

  it('ignores a receipt that is not ours', () => {
    expect(paymentIdFromReceipt('rcpt_123')).toBeNull();
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

describe('razorpayCheckoutSignatureValid', () => {
  const secret = 'key_secret';
  const signed = createHmac('sha256', secret).update('order_1|pay_1').digest('hex');

  it('accepts the hex HMAC of "order id|payment id"', () => {
    expect(razorpayCheckoutSignatureValid('order_1', 'pay_1', signed, secret)).toBe(true);
  });

  it('refuses another order, another payment or another secret', () => {
    expect(razorpayCheckoutSignatureValid('order_2', 'pay_1', signed, secret)).toBe(false);
    expect(razorpayCheckoutSignatureValid('order_1', 'pay_2', signed, secret)).toBe(false);
    expect(razorpayCheckoutSignatureValid('order_1', 'pay_1', signed, 'other')).toBe(false);
    expect(razorpayCheckoutSignatureValid('order_1', 'pay_1', 'not-hex', secret)).toBe(false);
  });
});

describe('razorpaySignatureValid', () => {
  const secret = 'whsec_test';
  const body = '{"event":"order.paid"}';
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
  it('reads the receipt and the payment id from order.paid', () => {
    const body = JSON.stringify({
      event: 'order.paid',
      payload: {
        order: { entity: { id: 'order_1', receipt: `vivah_${PAYMENT_ID}` } },
        payment: { entity: { id: 'pay_1' } },
      },
    });
    expect(parseRazorpayWebhook(body)).toEqual({
      receipt: `vivah_${PAYMENT_ID}`,
      razorpayPaymentId: 'pay_1',
    });
  });

  it('ignores other events, bodies with no receipt, and bodies that are not JSON', () => {
    expect(parseRazorpayWebhook(JSON.stringify({ event: 'payment.captured' }))).toBeNull();
    expect(parseRazorpayWebhook(JSON.stringify({ event: 'order.paid', payload: {} }))).toBeNull();
    expect(parseRazorpayWebhook('not json')).toBeNull();
  });
});

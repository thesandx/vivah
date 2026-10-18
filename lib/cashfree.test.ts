// @vitest-environment node

import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  cashfreeCustomerPhone,
  cashfreeLinkId,
  cashfreeSignatureValid,
  parseCashfreeWebhook,
  paymentIdFromLinkId,
} from '@/lib/cashfree';

const PAYMENT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const SECRET = 'cfsk_ma_test_secret';

function sign(timestamp: string, body: string, secret = SECRET): string {
  return createHmac('sha256', secret)
    .update(timestamp + body)
    .digest('base64');
}

describe('link ids', () => {
  it('round-trips a payment id through the link id', () => {
    const linkId = cashfreeLinkId(PAYMENT_ID);
    expect(linkId).toBe(`vivah_${PAYMENT_ID}`);
    expect(linkId.length).toBeLessThanOrEqual(50);
    expect(paymentIdFromLinkId(linkId)).toBe(PAYMENT_ID);
  });

  it('ignores a link that is not ours', () => {
    expect(paymentIdFromLinkId('payment_ps11')).toBeNull();
    expect(paymentIdFromLinkId('vivah_short')).toBeNull();
    expect(() => cashfreeLinkId('../etc')).toThrow();
  });
});

describe('cashfreeCustomerPhone', () => {
  it('sends ten digits for an Indian number and the digits for any other', () => {
    expect(cashfreeCustomerPhone('+919876543210')).toBe('9876543210');
    expect(cashfreeCustomerPhone('+14155550100')).toBe('14155550100');
  });
});

describe('cashfreeSignatureValid', () => {
  const body = '{"data":{"link_id":"vivah_x"},"type":"PAYMENT_LINK_EVENT"}';

  it('accepts the signature Cashfree computes over the raw body', () => {
    expect(cashfreeSignatureValid(body, '1617695238078', sign('1617695238078', body), SECRET)).toBe(
      true,
    );
  });

  it('refuses a changed body, another key, or a missing header', () => {
    const signature = sign('1617695238078', body);
    expect(cashfreeSignatureValid(`${body} `, '1617695238078', signature, SECRET)).toBe(false);
    expect(cashfreeSignatureValid(body, '1617695238079', signature, SECRET)).toBe(false);
    expect(cashfreeSignatureValid(body, '1617695238078', signature, 'another')).toBe(false);
    expect(cashfreeSignatureValid(body, null, signature, SECRET)).toBe(false);
    expect(cashfreeSignatureValid(body, '1617695238078', null, SECRET)).toBe(false);
    expect(cashfreeSignatureValid(body, '1617695238078', signature, '')).toBe(false);
  });
});

describe('parseCashfreeWebhook', () => {
  it('reads the link id and order id from a JSON event', () => {
    const body = JSON.stringify({
      data: { link_id: 'vivah_x', link_status: 'PAID', order: { order_id: 'CFPay_1' } },
      type: 'PAYMENT_LINK_EVENT',
    });
    expect(parseCashfreeWebhook(body)).toEqual({ linkId: 'vivah_x', orderId: 'CFPay_1' });
  });

  it('reads a link id from form data', () => {
    expect(parseCashfreeWebhook('link_id=vivah_x&link_status=PAID')).toEqual({
      linkId: 'vivah_x',
      orderId: null,
    });
  });

  it('ignores other events and bodies with no link', () => {
    expect(
      parseCashfreeWebhook(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} })),
    ).toBeNull();
    expect(parseCashfreeWebhook(JSON.stringify({ data: { order: null } }))).toBeNull();
    expect(parseCashfreeWebhook('hello')).toBeNull();
  });
});

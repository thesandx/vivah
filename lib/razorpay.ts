import { createHmac, timingSafeEqual } from 'node:crypto';

import { cashfreeLinkId, paymentIdFromLinkId } from '@/lib/cashfree';

/**
 * The pure half of the Razorpay integration: the order receipt, the amount in
 * paise, both signatures and the webhook's order. No I/O, so every rule is
 * tested without Razorpay. The HTTP calls live in
 * `services/razorpay.service.ts`. ADR-0012.
 */

/**
 * The `receipt` of an order: `vivah_<payment id>`, the same id Cashfree gets,
 * so one payment document never has two names. Razorpay allows 40
 * characters; this is 26.
 */
export function razorpayReceipt(paymentId: string): string {
  return cashfreeLinkId(paymentId);
}

/** The payment document id inside a receipt, or `null` when the order is not ours. */
export function paymentIdFromReceipt(receipt: string): string | null {
  return paymentIdFromLinkId(receipt);
}

/** Rupees to paise, the unit Razorpay counts in. Whole paise only. */
export function toPaise(rupees: number): number {
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise) || paise < 100) throw new Error('Not a payable amount.');
  return paise;
}

/** A constant-time compare of a hex signature with HMAC-SHA256(message, secret). */
function hexHmacMatches(message: string, signature: string | null, secret: string): boolean {
  if (signature === null || secret === '' || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(message).digest();
  const presented = Buffer.from(signature, 'hex');
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/**
 * Checks the signature the checkout hands the page after a payment:
 * hex(HMAC-SHA256(`<order id>|<payment id>`, key secret)).
 */
export function razorpayCheckoutSignatureValid(
  orderId: string,
  razorpayPaymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  return hexHmacMatches(`${orderId}|${razorpayPaymentId}`, signature, keySecret);
}

/**
 * Checks a webhook's `x-razorpay-signature`: hex(HMAC-SHA256(raw body,
 * webhook secret)). The RAW body, exactly as it arrived; a parsed and
 * re-serialised body does not match.
 */
export function razorpaySignatureValid(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): boolean {
  return hexHmacMatches(rawBody, signature, webhookSecret);
}

/** What the webhook needs from its body: our receipt, and Razorpay's payment id. */
export interface RazorpayWebhookOrder {
  receipt: string;
  /** Razorpay's `pay_...` id, for the record and for a refund. */
  razorpayPaymentId: string | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function entity(
  payload: Record<string, unknown> | null,
  name: string,
): Record<string, unknown> | null {
  return record(record(payload?.[name])?.entity);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * The receipt in an `order.paid` event, or `null` for any other body.
 * Nothing else in the body is trusted: the webhook asks Razorpay for the
 * order's status itself.
 */
export function parseRazorpayWebhook(rawBody: string): RazorpayWebhookOrder | null {
  let body: Record<string, unknown> | null;
  try {
    body = record(JSON.parse(rawBody));
  } catch {
    return null;
  }
  if (body?.event !== 'order.paid') return null;
  const payload = record(body.payload);
  const receipt = text(entity(payload, 'order')?.receipt);
  if (receipt === null) return null;
  return { receipt, razorpayPaymentId: text(entity(payload, 'payment')?.id) };
}

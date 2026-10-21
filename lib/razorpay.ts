import { createHmac, timingSafeEqual } from 'node:crypto';

import { cashfreeLinkId, paymentIdFromLinkId } from '@/lib/cashfree';

/**
 * The pure half of the Razorpay integration: the reference id, the amount in
 * paise, the webhook signature and the webhook's payment link. No I/O, so
 * every rule is tested without Razorpay. The HTTP calls live in
 * `services/razorpay.service.ts`. ADR-0012.
 */

/**
 * The `reference_id` of a payment link: `vivah_<payment id>`, the same id
 * Cashfree gets, so one payment document never has two names. Razorpay allows
 * 40 characters and refuses a repeat; this is 26 and unique per document.
 */
export function razorpayReferenceId(paymentId: string): string {
  return cashfreeLinkId(paymentId);
}

/** The payment document id inside a reference id, or `null` when the link is not ours. */
export function paymentIdFromReferenceId(referenceId: string): string | null {
  return paymentIdFromLinkId(referenceId);
}

/** Rupees to paise, the unit Razorpay counts in. Whole paise only. */
export function toPaise(rupees: number): number {
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise) || paise < 100) throw new Error('Not a payable amount.');
  return paise;
}

/**
 * Checks a webhook's `x-razorpay-signature`: hex(HMAC-SHA256(raw body,
 * webhook secret)). The RAW body, exactly as it arrived; a parsed and
 * re-serialised body does not match. Constant-time.
 */
export function razorpaySignatureValid(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): boolean {
  if (signature === null || webhookSecret === '' || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest();
  const presented = Buffer.from(signature, 'hex');
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/** What the webhook needs from its body: our reference, and Razorpay's payment id. */
export interface RazorpayWebhookLink {
  referenceId: string;
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
 * The reference id in a `payment_link.*` event, or `null` for any other body.
 * Nothing else in the body is trusted: the webhook asks Razorpay for the
 * link's status itself.
 */
export function parseRazorpayWebhook(rawBody: string): RazorpayWebhookLink | null {
  let body: Record<string, unknown> | null;
  try {
    body = record(JSON.parse(rawBody));
  } catch {
    return null;
  }
  const event = text(body?.event);
  if (event === null || !event.startsWith('payment_link.')) return null;
  const payload = record(body?.payload);
  const referenceId = text(entity(payload, 'payment_link')?.reference_id);
  if (referenceId === null) return null;
  return { referenceId, razorpayPaymentId: text(entity(payload, 'payment')?.id) };
}

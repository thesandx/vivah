import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The pure half of the Cashfree integration: link ids, the customer phone,
 * the webhook signature and the webhook's link id. No I/O, so every rule is
 * tested without Cashfree. The HTTP calls live in `services/cashfree.service.ts`.
 * ADR-0011.
 */

/** Every link id we make starts with this, so a webhook for another product is ignored. */
const LINK_ID_PREFIX = 'vivah_';

/** A Firestore auto id: 20 characters of base62. */
const PAYMENT_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

/**
 * The Cashfree link id for a payment document: `vivah_<payment id>`. Cashfree
 * allows 50 characters of letters, digits, `-` and `_`; this is 26.
 */
export function cashfreeLinkId(paymentId: string): string {
  if (!PAYMENT_ID_PATTERN.test(paymentId)) throw new Error('Not a payment id.');
  return `${LINK_ID_PREFIX}${paymentId}`;
}

/** The payment document id inside a link id, or `null` when the link is not ours. */
export function paymentIdFromLinkId(linkId: string): string | null {
  if (!linkId.startsWith(LINK_ID_PREFIX)) return null;
  const id = linkId.slice(LINK_ID_PREFIX.length);
  return PAYMENT_ID_PATTERN.test(id) ? id : null;
}

/**
 * The phone Cashfree's checkout shows and pre-fills: ten digits for an Indian
 * number (`+919876543210` → `9876543210`), the digits alone for any other.
 */
export function cashfreeCustomerPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return phoneE164.startsWith('+91') && digits.length === 12 ? digits.slice(2) : digits;
}

/**
 * Checks a webhook's `x-webhook-signature`: Base64(HMAC-SHA256(timestamp +
 * raw body, secret key)). The RAW body, exactly as it arrived; a parsed and
 * re-serialised body does not match. Constant-time.
 */
export function cashfreeSignatureValid(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secretKey: string,
): boolean {
  if (timestamp === null || signature === null || timestamp === '' || secretKey === '') {
    return false;
  }
  const expected = createHmac('sha256', secretKey)
    .update(timestamp + rawBody)
    .digest();
  const presented = Buffer.from(signature, 'base64');
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/** What the webhook needs from its body: the link, and the order id when it has one. */
export interface CashfreeWebhookLink {
  linkId: string;
  orderId: string | null;
}

function stringField(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * The link id and order id in a `PAYMENT_LINK_EVENT` body, or `null` for any
 * other body. Cashfree documents a JSON body and also says it sends form
 * data, so both are read. Nothing else in the body is trusted: the webhook
 * asks Cashfree for the link's status itself.
 */
export function parseCashfreeWebhook(rawBody: string): CashfreeWebhookLink | null {
  let data: Record<string, unknown> | null = null;
  try {
    const parsed = record(JSON.parse(rawBody));
    if (parsed !== null && parsed.type !== undefined && parsed.type !== 'PAYMENT_LINK_EVENT') {
      return null;
    }
    data = record(parsed?.data);
  } catch {
    const form = new URLSearchParams(rawBody);
    const linkId = form.get('link_id');
    return linkId === null || linkId === '' ? null : { linkId, orderId: form.get('order_id') };
  }
  if (data === null) return null;
  const linkId = stringField(data.link_id);
  if (linkId === null) return null;
  return { linkId, orderId: stringField(record(data.order)?.order_id) };
}

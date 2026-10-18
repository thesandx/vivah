import { NextResponse } from 'next/server';

import { cashfreeSignatureValid, parseCashfreeWebhook, paymentIdFromLinkId } from '@/lib/cashfree';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { completePayment } from '@/services/payment.service';

/**
 * `POST /api/payments/cashfree` — Cashfree's webhook for a payment link.
 * NO SESSION, on purpose: Cashfree is the caller. ADR-0011.
 *
 *   - The signature is checked first, on the raw body, with the secret key.
 *     A request that fails it changes nothing.
 *   - The body only names the link. Whether it is paid is read back from
 *     Cashfree's API (`completePayment`), so even a valid body for an old
 *     event cannot publish an unpaid invite.
 *   - It is safe to repeat. Cashfree retries until it gets a 2xx, so a
 *     failure answers 500 and the next try settles it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cashfree's events are small. A larger body is not one of them. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.cashfree.enabled) {
    return NextResponse.json({ error: 'payments_off' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  const valid = cashfreeSignatureValid(
    rawBody,
    request.headers.get('x-webhook-timestamp'),
    request.headers.get('x-webhook-signature'),
    env.cashfree.secretKey,
  );
  if (!valid) {
    logger.warn('A Cashfree webhook failed its signature check');
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  const event = parseCashfreeWebhook(rawBody);
  const paymentId = event === null ? null : paymentIdFromLinkId(event.linkId);
  if (event === null || paymentId === null) {
    // Signed by Cashfree, but not a link of ours. Nothing to do; no retry.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await completePayment(paymentId, event.orderId);
    return NextResponse.json({ ok: true, state: result.state });
  } catch (error) {
    logger.error('Settling a Cashfree webhook failed', error, { paymentId });
    return NextResponse.json({ error: 'retry' }, { status: 500 });
  }
}

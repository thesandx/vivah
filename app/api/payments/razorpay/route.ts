import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { parseRazorpayWebhook, paymentIdFromReceipt, razorpaySignatureValid } from '@/lib/razorpay';
import { completePayment } from '@/services/payment.service';

/**
 * `POST /api/payments/razorpay` — Razorpay's webhook, for `order.paid`.
 * NO SESSION, on purpose: Razorpay is the caller. ADR-0012.
 *
 *   - The signature is checked first, on the raw body, with the webhook
 *     secret set in Razorpay's dashboard. A request that fails it changes
 *     nothing.
 *   - The body only names the order. Whether it is paid is read back from
 *     Razorpay's API (`completePayment`), so even a valid body for an old
 *     event cannot publish an unpaid invite.
 *   - The checkout's own answer (`/api/payments/razorpay/confirm`) usually
 *     settles the payment first. This covers a couple who closes the tab
 *     before that answer arrives.
 *   - It is safe to repeat. Razorpay retries a failed delivery, so a failure
 *     answers 500 and the next try settles it.
 *
 * It answers while Razorpay is configured, even when Cashfree is the active
 * provider, so a payment started before a switch still settles.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Razorpay's events are small. A larger body is not one of them. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.razorpay.enabled || env.razorpay.webhookSecret === '') {
    return NextResponse.json({ error: 'payments_off' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  const valid = razorpaySignatureValid(
    rawBody,
    request.headers.get('x-razorpay-signature'),
    env.razorpay.webhookSecret,
  );
  if (!valid) {
    logger.warn('A Razorpay webhook failed its signature check');
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  const event = parseRazorpayWebhook(rawBody);
  const paymentId = event === null ? null : paymentIdFromReceipt(event.receipt);
  if (event === null || paymentId === null) {
    // Signed by Razorpay, but not an order of ours. Nothing to do; no retry.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await completePayment(paymentId, event.razorpayPaymentId);
    return NextResponse.json({ ok: true, state: result.state });
  } catch (error) {
    logger.error('Settling a Razorpay webhook failed', error, { paymentId });
    return NextResponse.json({ error: 'retry' }, { status: 500 });
  }
}

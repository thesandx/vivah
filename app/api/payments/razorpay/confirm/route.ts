import { NextResponse } from 'next/server';
import { z } from 'zod';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { confirmRazorpayCheckout, payments } from '@/services/payment.service';

/**
 * `POST /api/payments/razorpay/confirm` — the preview page posts what
 * Razorpay's checkout handed it after a payment. NO SESSION, on purpose: any
 * browser that can see the preview may pay (ADR-0011), and the money is the
 * proof. ADR-0012.
 *
 *   - The checkout's signature is checked first, with the key secret.
 *   - Whether the order is paid is read back from Razorpay's API, so a
 *     made-up or replayed answer publishes nothing.
 *   - It answers where the page goes next, as the Cashfree return does:
 *     `?payment=success` when published, `choose` when the address went to
 *     another couple first, `pending` otherwise.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const answerSchema = z.object({
  paymentId: z.string().regex(/^[A-Za-z0-9]{20}$/),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(128),
});

export interface ConfirmAnswer {
  /** Relative: the preview page, with what happened in `?payment=`. */
  url: string;
}

function answer(url: string, status = 200): NextResponse<ConfirmAnswer> {
  return NextResponse.json({ url }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!env.razorpay.enabled) {
    return NextResponse.json({ error: 'payments_off' }, { status: 503 });
  }
  const parsed = answerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { paymentId } = parsed.data;

  try {
    const result = await confirmRazorpayCheckout(paymentId, {
      orderId: parsed.data.razorpay_order_id,
      razorpayPaymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });
    switch (result.state) {
      case 'published':
        return answer(`/preview/${result.leadId}?payment=success`);
      case 'address-taken':
        return answer(`/preview/${result.leadId}?payment=choose`);
      case 'pending':
      case 'failed':
        return answer(`/preview/${result.leadId}?payment=${result.state}`);
      case 'bad-signature':
        return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
      case 'not-found':
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  } catch (error) {
    // Razorpay took the money, or will: the webhook settles it. Say pending.
    logger.error('Confirming a Razorpay checkout failed', error, { paymentId });
    const payment = await payments.get(paymentId).catch(() => null);
    return payment === null
      ? NextResponse.json({ error: 'retry' }, { status: 500 })
      : answer(`/preview/${payment.leadId}?payment=pending`);
  }
}

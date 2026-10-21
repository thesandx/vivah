import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { paymentIdFromReferenceId } from '@/lib/razorpay';
import { completePayment, payments } from '@/services/payment.service';

/**
 * `GET /api/payments/razorpay/return?payment=<id>` — where Razorpay's page
 * sends the couple after they pay. ADR-0012.
 *
 * It asks Razorpay for the link's status and settles the payment at once, so
 * the couple does not wait for the webhook. Razorpay adds its own
 * `razorpay_*` parameters and a signature; they are not needed, because the
 * status is read from Razorpay's API, and a made-up or unpaid payment
 * publishes nothing.
 *
 * Where it sends the couple matches the Cashfree return: `?payment=success`
 * on the preview when published, `choose` when the address went to another
 * couple first, `pending` or `failed` otherwise.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A Firestore auto id. */
const PAYMENT_ID = /^[A-Za-z0-9]{20}$/;

/**
 * A relative Location for the preview: behind the Cloudflare Worker,
 * `request.url` is the container's own address. See `app/p/[id]/route.ts`.
 */
function redirect(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

export async function GET(request: Request): Promise<NextResponse> {
  const query = new URL(request.url).searchParams;
  const named = query.get('payment') ?? '';
  // Razorpay adds the reference id too; ours wins, but either names the payment.
  const paymentId = PAYMENT_ID.test(named)
    ? named
    : paymentIdFromReferenceId(query.get('razorpay_payment_link_reference_id') ?? '');
  if (paymentId === null || !env.razorpay.enabled) return redirect('/');

  try {
    const result = await completePayment(paymentId);
    switch (result.state) {
      case 'published':
        return redirect(`/preview/${result.leadId}?payment=success`);
      case 'address-taken':
        return redirect(`/preview/${result.leadId}?payment=choose`);
      case 'pending':
      case 'failed':
        return redirect(`/preview/${result.leadId}?payment=${result.state}`);
      case 'not-found':
        return redirect('/');
    }
  } catch (error) {
    logger.error('Settling a return from Razorpay failed', error, { paymentId });
    const payment = await payments.get(paymentId).catch(() => null);
    return redirect(payment === null ? '/' : `/preview/${payment.leadId}?payment=pending`);
  }
}

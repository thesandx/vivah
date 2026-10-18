import { NextResponse } from 'next/server';

import { paymentIdFromLinkId } from '@/lib/cashfree';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { completePayment, payments } from '@/services/payment.service';

/**
 * `GET /api/payments/cashfree/return?payment=<id>` — where Cashfree's page
 * sends the couple after they pay. ADR-0011.
 *
 * It asks Cashfree for the link's status and settles the payment at once, so
 * the couple does not wait for the webhook. A paid one goes to
 * `/preview/<id>?payment=success`, which says so and then opens the live invite. The
 * query only names the payment; a made-up or unpaid one publishes nothing.
 *
 * Every other outcome goes back to the preview, which says what happened:
 * `?payment=pending` (Cashfree has not confirmed yet), `failed`, or
 * `choose` (paid, but the address went to another couple first).
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
  // Cashfree may add its own `link_id`; ours wins, but either names the payment.
  const paymentId = PAYMENT_ID.test(named)
    ? named
    : paymentIdFromLinkId(query.get('link_id') ?? '');
  if (paymentId === null || !env.cashfree.enabled) return redirect('/');

  try {
    const result = await completePayment(paymentId);
    switch (result.state) {
      case 'published':
        // The preview shows "Payment successful", then counts down to the live site.
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
    logger.error('Settling a return from Cashfree failed', error, { paymentId });
    const payment = await payments.get(paymentId).catch(() => null);
    return redirect(payment === null ? '/' : `/preview/${payment.leadId}?payment=pending`);
  }
}

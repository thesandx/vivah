import { PAYMENT_PROVIDER_NAMES } from '@/lib/business';
import { env } from '@/lib/env';
import { invoiceFileName, invoiceNumber, invoicePdf, parseIssuerLines } from '@/lib/invoice';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel } from '@/lib/site-host';
import { getPaidPaymentForWedding, getWeddingForAdmin } from '@/services/admin.service';
import { getAdminSession } from '@/services/admin-session.service';

/**
 * `GET /admin/invites/<wedding id>/invoice` — the invoice for a paid invite,
 * as a PDF download. The invite page links it when a paid payment exists.
 *
 * A read, but of a couple's name and phone, so it needs the admin session
 * like every `/admin` page. It answers 404 when `/admin` is off, the invite
 * does not exist or nothing was paid for it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!env.adminEnabled) return plain(404, 'Not found.');
  const session = await getAdminSession();
  if (session === null) return plain(401, 'Sign in to /admin first.');

  const { id } = await params;
  try {
    const wedding = await getWeddingForAdmin(id);
    if (wedding === null) return plain(404, 'No invite with this id.');
    const payment = await getPaidPaymentForWedding(wedding);
    if (payment?.paidAt === undefined) return plain(404, 'No payment is recorded for this invite.');

    const number = invoiceNumber(payment.id, payment.paidAt);
    const pdf = invoicePdf({
      paymentId: payment.id,
      paidAt: payment.paidAt,
      amountRupees: payment.amountPaid ?? payment.amountRupees,
      providerName: PAYMENT_PROVIDER_NAMES[payment.provider ?? 'cashfree'],
      providerPaymentId: payment.orderId ?? null,
      test: payment.environment === 'sandbox',
      bride: wedding.bride,
      groom: wedding.groom,
      phone: formatPhoneForDisplay(wedding.ownerPhoneE164),
      siteAddress: inviteHostLabel(wedding.slug, env.rootDomain),
      issuerLines: parseIssuerLines(env.invoiceIssuer),
    });
    logger.info('Admin downloaded an invoice', { weddingId: wedding.id, paymentId: payment.id });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceFileName(wedding.slug, number)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.error('Drawing an invoice failed', error, { weddingId: id });
    return plain(500, 'The invoice could not be made. Try again.');
  }
}

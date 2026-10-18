import 'server-only';

import { z } from 'zod';

import { cashfreeCustomerPhone, cashfreeLinkId } from '@/lib/cashfree';
import { slugProblem } from '@/lib/couple-slug';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { siteOrigin } from '@/lib/seo';
import { CashfreeError, createPaymentLink, getPaymentLink } from '@/services/cashfree.service';
import { type LeadDocument, leads } from '@/services/lead.service';
import { createRepository, type StoredDocument } from '@/services/repository';
import { notifyPayment } from '@/services/telegram.service';
import {
  checkSlug,
  slugClaimId,
  slugClaims,
  weddingAtSlugQuery,
  writePublish,
} from '@/services/wedding.service';

/**
 * Payments: one document per Cashfree payment link, under an auto id. The
 * link id is `vivah_<payment id>` (`lib/cashfree.ts`), so a webhook or a
 * return from Cashfree finds its document with one key lookup. ADR-0011.
 *
 * A couple may start more than one payment (a second tap, a retry after a
 * failed UPI). Each gets its own link and document. The first one Cashfree
 * reports PAID publishes the invite. A later one is kept, marked `duplicate`,
 * for a refund by hand.
 *
 * The document is also the order record the ad platforms will need for a
 * purchase conversion: the lead id, the amount, Cashfree's order id and when
 * it was paid.
 */

export const PAYMENT_COLLECTION = 'payments';

export const PAYMENT_STATUSES = ['created', 'paid', 'failed'] as const;

/** What a paid payment did. */
export const PAYMENT_OUTCOMES = ['published', 'address-taken', 'duplicate', 'no-lead'] as const;

export const paymentSchema = z.object({
  leadId: z.string().min(1).max(128),
  /** The address the couple was paying for. */
  slug: z.string().min(1).max(63),
  /** What the link asks for, in rupees. */
  amountRupees: z.number().positive(),
  /** Which Cashfree account the link lives in. */
  environment: z.enum(['sandbox', 'production']),
  status: z.enum(PAYMENT_STATUSES),
  /** Cashfree's page for this payment. Set once the link exists. */
  linkUrl: z.string().url().optional(),
  /** Cashfree's own id for the link. */
  cfLinkId: z.string().optional(),
  /** Cashfree's order id, from the webhook. For conversions and refunds. */
  orderId: z.string().optional(),
  amountPaid: z.number().optional(),
  paidAt: z.date().optional(),
  outcome: z.enum(PAYMENT_OUTCOMES).optional(),
});

export type PaymentPayload = z.infer<typeof paymentSchema>;
export type PaymentDocument = StoredDocument<PaymentPayload>;

export const payments = createRepository({
  collection: PAYMENT_COLLECTION,
  schema: paymentSchema,
});

/**
 * How the preview's pay button behaves:
 *
 *   - `live`: Cashfree is configured. The button opens a payment link.
 *   - `test`: development without Cashfree keys. The button publishes free,
 *     and the banner says so (ADR-0007). Never in production.
 *   - `off`: production without Cashfree keys. The button says payment is
 *     not available. It never publishes free.
 */
export type PaymentMode = 'live' | 'test' | 'off';

export function paymentMode(): PaymentMode {
  if (env.cashfree.enabled) return 'live';
  return env.isProduction ? 'off' : 'test';
}

/**
 * How long a payment link stays open. Longer than the preview's 30 minutes,
 * so a couple who starts paying near the end can still finish. A paid link
 * publishes even when the preview has closed meanwhile.
 */
const LINK_LIFETIME_MS = 60 * 60 * 1000;

export type StartPaymentResult =
  | { state: 'redirect'; url: string }
  | { state: 'published'; slug: string }
  | { state: 'already-published'; slug: string }
  | { state: 'taken' }
  | { state: 'invalid'; message: string }
  | { state: 'not-found' }
  | { state: 'expired' }
  | { state: 'unavailable' };

/**
 * Starts paying for `slug`: checks the lead and the address, creates a
 * payment document and a Cashfree link, and returns the link for the browser
 * to open. Nothing is reserved yet; the address is claimed when the payment
 * completes (`completePayment`).
 *
 * No browser binding: any browser that can see the preview may pay for it.
 * The money is the proof, not the cookie. ADR-0011.
 *
 * A lead that paid already but lost its address to another couple publishes
 * at the new one here, with no second payment.
 */
export async function startPayment(
  leadId: string,
  slug: string,
  amountRupees: number,
  now: Date = new Date(),
): Promise<StartPaymentResult> {
  const problem = slugProblem(slug);
  if (problem !== null) return { state: 'invalid', message: problem };

  const lead = await leads.get(leadId);
  if (lead === null) return { state: 'not-found' };
  if (lead.status === 'paid') {
    if (lead.weddingSlug !== undefined) {
      return { state: 'already-published', slug: lead.weddingSlug };
    }
    return publishPaidLead(leadId, slug);
  }
  if (lead.expiresAt.getTime() <= now.getTime()) return { state: 'expired' };
  if (!(await checkSlug(slug)).available) return { state: 'taken' };
  if (!env.cashfree.enabled) return { state: 'unavailable' };

  const paymentId = await payments.create({
    leadId,
    slug,
    amountRupees,
    environment: env.cashfree.environment,
    status: 'created',
  });
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  try {
    const link = await createPaymentLink({
      linkId: cashfreeLinkId(paymentId),
      amountRupees,
      purpose: `Wedding invite at ${slug}.${new URL(origin).host}`,
      customerName: `${lead.bride} & ${lead.groom}`.slice(0, 100),
      customerPhone: cashfreeCustomerPhone(lead.phoneE164),
      returnUrl: `${origin}/api/payments/cashfree/return?payment=${paymentId}`,
      notifyUrl: `${origin}/api/payments/cashfree`,
      expiresAt: new Date(now.getTime() + LINK_LIFETIME_MS),
      notes: { lead_id: leadId, slug },
    });
    await payments.update(paymentId, {
      linkUrl: link.link_url,
      ...(link.cf_link_id !== undefined && { cfLinkId: link.cf_link_id }),
    });
    logger.info('Payment started', { leadId, paymentId });
    return { state: 'redirect', url: link.link_url };
  } catch (error) {
    await payments.update(paymentId, { status: 'failed' });
    throw error;
  }
}

/** The couple's fields a payment notice needs. */
function coupleOf(lead: LeadDocument): { bride: string; groom: string; phoneE164: string } {
  return { bride: lead.bride, groom: lead.groom, phoneE164: lead.phoneE164 };
}

/** Publishes a lead that paid already, at a new address. No payment. */
async function publishPaidLead(leadId: string, slug: string): Promise<StartPaymentResult> {
  const result = await slugClaims.runTransaction(async (claimsTx, tx) => {
    const lead = await leads.inTransaction(tx).get(leadId);
    const claim = await claimsTx.get(slugClaimId(slug));
    const existing = await tx.get(weddingAtSlugQuery(slug));
    if (lead === null) return { state: 'not-found' as const };
    if (lead.weddingSlug !== undefined) {
      return { state: 'already-published' as const, slug: lead.weddingSlug };
    }
    if (claim !== null || !existing.empty) return { state: 'taken' as const };
    writePublish(tx, lead, slug);
    return { state: 'published' as const, slug, lead };
  });
  if (result.state !== 'published') return result;

  // The couple paid earlier; now the site is live, so the team gets the
  // welcome message to send them, as for any other payment.
  const paymentId = result.lead.paymentId;
  const payment = paymentId === undefined ? null : await payments.get(paymentId);
  if (paymentId !== undefined && payment !== null) {
    await notifyPayment({
      paymentId,
      leadId,
      slug,
      amountRupees: payment.amountPaid ?? payment.amountRupees,
      kind: 'published',
      ...coupleOf(result.lead),
    });
  }
  return { state: 'published', slug };
}

export type CompletePaymentResult =
  | { state: 'published'; leadId: string; slug: string }
  /** Paid, but another couple took the address first. The couple picks another. */
  | { state: 'address-taken'; leadId: string }
  | { state: 'pending'; leadId: string }
  | { state: 'failed'; leadId: string }
  | { state: 'not-found' };

/** The link states that will never become PAID. */
const CLOSED_LINK_STATES = new Set(['EXPIRED', 'CANCELLED']);

/**
 * Settles a payment from Cashfree's own record of its link. The webhook and
 * the return from Cashfree's page both call this; whichever comes first
 * publishes, and the other finds it done. Safe to call any number of times.
 *
 * `orderId` comes from the webhook body, for the record only. It decides
 * nothing.
 */
export async function completePayment(
  paymentId: string,
  orderId: string | null = null,
  now: Date = new Date(),
): Promise<CompletePaymentResult> {
  const payment = await payments.get(paymentId);
  if (payment === null) return { state: 'not-found' };
  if (payment.status === 'paid') return settledResult(payment);

  const link = await getPaymentLink(cashfreeLinkId(paymentId));
  if (link.link_status !== 'PAID') {
    if (CLOSED_LINK_STATES.has(link.link_status)) {
      await payments.update(paymentId, { status: 'failed' });
      return { state: 'failed', leadId: payment.leadId };
    }
    return { state: 'pending', leadId: payment.leadId };
  }

  const amountPaid = link.link_amount_paid ?? link.link_amount;
  if (amountPaid < payment.amountRupees || (link.link_currency ?? 'INR') !== 'INR') {
    // Cannot happen with partial payments off. Never publish on it; a person looks.
    logger.error('A payment link is PAID with the wrong amount', undefined, {
      paymentId,
      leadId: payment.leadId,
      amountPaid,
    });
    return { state: 'pending', leadId: payment.leadId };
  }

  const paid = {
    status: 'paid' as const,
    paidAt: now,
    amountPaid,
    ...(orderId !== null && { orderId }),
  };

  const result = await slugClaims.runTransaction(async (claimsTx, tx) => {
    const paymentsTx = payments.inTransaction(tx);
    const leadsTx = leads.inTransaction(tx);
    // All reads first.
    const current = await paymentsTx.get(paymentId);
    const lead = await leadsTx.get(payment.leadId);
    const claim = await claimsTx.get(slugClaimId(payment.slug));
    const existing = await tx.get(weddingAtSlugQuery(payment.slug));

    if (current === null) return { state: 'not-found' as const };
    if (current.status === 'paid') return { state: 'settled' as const };
    if (lead === null) {
      paymentsTx.update(paymentId, { ...paid, outcome: 'no-lead' });
      return { state: 'no-lead' as const };
    }
    if (lead.status === 'paid') {
      // A second payment for one invite. Keep it for a refund by hand.
      paymentsTx.update(paymentId, { ...paid, outcome: 'duplicate' });
      return { state: 'duplicate' as const, lead };
    }
    const fields = { paidAt: now, paymentId };
    if (claim === null && existing.empty) {
      writePublish(tx, lead, payment.slug, fields);
      paymentsTx.update(paymentId, { ...paid, outcome: 'published' });
      return { state: 'published' as const, lead };
    }
    leadsTx.update(lead.id, { status: 'paid', ...fields });
    paymentsTx.update(paymentId, { ...paid, outcome: 'address-taken' });
    return { state: 'address-taken' as const, lead };
  });

  const context = { paymentId, leadId: payment.leadId };
  switch (result.state) {
    case 'not-found':
      return { state: 'not-found' };
    case 'settled': {
      const settled = await payments.get(paymentId);
      return settled === null ? { state: 'not-found' } : settledResult(settled);
    }
    case 'no-lead':
      logger.error('A payment was made for a lead that does not exist', undefined, context);
      return { state: 'not-found' };
    case 'duplicate':
      logger.warn('A lead was paid for twice; refund the second payment', context);
      await notifyPayment({
        ...context,
        slug: payment.slug,
        amountRupees: amountPaid,
        kind: 'duplicate',
        ...coupleOf(result.lead),
      });
      return result.lead.weddingSlug === undefined
        ? { state: 'address-taken', leadId: payment.leadId }
        : { state: 'published', leadId: payment.leadId, slug: result.lead.weddingSlug };
    case 'published':
      logger.info('Payment received; invite published', { ...context, slug: payment.slug });
      await notifyPayment({
        ...context,
        slug: payment.slug,
        amountRupees: amountPaid,
        kind: 'published',
        ...coupleOf(result.lead),
      });
      return { state: 'published', leadId: payment.leadId, slug: payment.slug };
    case 'address-taken':
      logger.warn('Payment received, but the address was taken; the couple picks another', context);
      await notifyPayment({
        ...context,
        slug: payment.slug,
        amountRupees: amountPaid,
        kind: 'address-taken',
        ...coupleOf(result.lead),
      });
      return { state: 'address-taken', leadId: payment.leadId };
  }
}

/** The answer for a payment that was settled before this call. */
async function settledResult(payment: PaymentDocument): Promise<CompletePaymentResult> {
  const lead = await leads.get(payment.leadId);
  if (lead === null) return { state: 'not-found' };
  return lead.weddingSlug === undefined
    ? { state: 'address-taken', leadId: lead.id }
    : { state: 'published', leadId: lead.id, slug: lead.weddingSlug };
}

export { CashfreeError };

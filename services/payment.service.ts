import 'server-only';

import { z } from 'zod';

import { PAYMENT_PROVIDER_NAMES } from '@/lib/business';
import { cashfreeCustomerPhone, cashfreeLinkId } from '@/lib/cashfree';
import { slugProblem } from '@/lib/couple-slug';
import { type AppliedCoupon, appliedCouponSchema } from '@/lib/coupons';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { razorpayCheckoutSignatureValid, razorpayReceipt } from '@/lib/razorpay';
import { siteOrigin } from '@/lib/seo';
import { CashfreeError, createPaymentLink, getPaymentLink } from '@/services/cashfree.service';
import { type LeadDocument, leads } from '@/services/lead.service';
import * as razorpay from '@/services/razorpay.service';
import { createRepository, type StoredDocument } from '@/services/repository';
import {
  notifyPayment,
  notifyPaymentFailure,
  type PaymentNotice,
} from '@/services/telegram.service';
import {
  checkSlug,
  slugClaimId,
  slugClaims,
  weddingAtSlugQuery,
  writePublish,
} from '@/services/wedding.service';
import type { RazorpayCheckout } from '@/types/razorpay-checkout';

/**
 * Payments: one document per payment link, under an auto id. The link id
 * (Cashfree) or reference id (Razorpay) is `vivah_<payment id>`
 * (`lib/cashfree.ts`), so a webhook or a return finds its document with one
 * key lookup. ADR-0011, and ADR-0012 for the second provider.
 *
 * Each document records the provider its link lives in, so a payment started
 * with one provider settles with that provider even after a switch.
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

export const PAYMENT_PROVIDERS = ['cashfree', 'razorpay'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const paymentSchema = z.object({
  leadId: z.string().min(1).max(128),
  /** The address the couple was paying for. */
  slug: z.string().min(1).max(63),
  /** What the link asks for, in rupees: the list price less any coupon. */
  amountRupees: z.number().positive(),
  /**
   * The coupon the couple applied, checked on the server when the payment
   * started. The lead gets it once the payment settles. ADR-0015.
   */
  coupon: appliedCouponSchema.optional(),
  /** Who holds the link. Absent on documents from before Razorpay: Cashfree. */
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  /** Which account the link lives in: test (`sandbox`) or live (`production`). */
  environment: z.enum(['sandbox', 'production']),
  status: z.enum(PAYMENT_STATUSES),
  /** The provider's page for this payment. Set once the link exists. */
  linkUrl: z.string().url().optional(),
  /** Cashfree's own id for the link. */
  cfLinkId: z.string().optional(),
  /** Razorpay's `order_` id. Its status is read by this id. */
  razorpayOrderId: z.string().optional(),
  /**
   * Cashfree's order id or Razorpay's `pay_` id, from the webhook. For
   * conversions and refunds.
   */
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
 *   - `live`: a provider is configured (`env.paymentProvider`). The button
 *     opens a payment link.
 *   - `test`: development without payment keys. The button publishes free,
 *     and the banner says so (ADR-0007). Never in production.
 *   - `off`: production without payment keys. The button says payment is
 *     not available. It never publishes free.
 */
export type PaymentMode = 'live' | 'test' | 'off';

export function paymentMode(): PaymentMode {
  if (env.paymentProvider !== null) return 'live';
  return env.isProduction ? 'off' : 'test';
}

/** The provider name the banner shows: `Cashfree` or `Razorpay`. */
export function paymentProviderName(): string | null {
  return env.paymentProvider === null ? null : PAYMENT_PROVIDER_NAMES[env.paymentProvider];
}

/**
 * How long a payment link stays open. Longer than the preview's 30 minutes,
 * so a couple who starts paying near the end can still finish. A paid link
 * publishes even when the preview has closed meanwhile.
 */
const LINK_LIFETIME_MS = 60 * 60 * 1000;

export type StartPaymentResult =
  | { state: 'redirect'; url: string }
  /** Razorpay: the page opens Razorpay's checkout over itself. */
  | { state: 'checkout'; checkout: RazorpayCheckout }
  | { state: 'published'; slug: string }
  | { state: 'already-published'; slug: string }
  | { state: 'taken' }
  | { state: 'invalid'; message: string }
  | { state: 'not-found' }
  | { state: 'expired' }
  | { state: 'unavailable' };

/**
 * Starts paying for `slug`: checks the lead and the address, creates a
 * payment document and a link with the active provider, and returns the link
 * for the browser to open. Nothing is reserved yet; the address is claimed when the payment
 * completes (`completePayment`).
 *
 * No browser binding: any browser that can see the preview may pay for it.
 * The money is the proof, not the cookie. ADR-0011.
 *
 * A lead that paid already but lost its address to another couple publishes
 * at the new one here, with no second payment.
 *
 * `amountRupees` is what the server priced (`quotePrice`), with `coupon`
 * when a code took something off. Never a price from the page.
 */
export async function startPayment(
  leadId: string,
  slug: string,
  amountRupees: number,
  now: Date = new Date(),
  coupon: AppliedCoupon | null = null,
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
  const provider = env.paymentProvider;
  if (provider === null) return { state: 'unavailable' };

  const environment = env[provider].environment;
  const paymentId = await payments.create({
    leadId,
    slug,
    amountRupees,
    ...(coupon !== null && { coupon }),
    provider,
    environment,
    status: 'created',
  });
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const link = {
    paymentId,
    amountRupees,
    description: `Wedding invite at ${slug}.${new URL(origin).host}`,
    customerName: `${lead.bride} & ${lead.groom}`.slice(0, 100),
    phoneE164: lead.phoneE164,
    origin,
    expiresAt: new Date(now.getTime() + LINK_LIFETIME_MS),
    notes: { lead_id: leadId, slug, ...(coupon !== null && { coupon: coupon.code }) },
  };
  try {
    if (provider === 'razorpay') {
      const checkout = await startRazorpayOrder(link);
      logger.info('Payment started', { leadId, paymentId, provider });
      return { state: 'checkout', checkout };
    }
    const url = await startCashfreeLink(link);
    logger.info('Payment started', { leadId, paymentId, provider });
    return { state: 'redirect', url };
  } catch (error) {
    await payments.update(paymentId, { status: 'failed' });
    await notifyPaymentFailure({
      paymentId,
      leadId,
      environment: `${PAYMENT_PROVIDER_NAMES[provider]} ${environment}`,
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/** What either provider needs to make a link. */
interface LinkRequest {
  paymentId: string;
  amountRupees: number;
  description: string;
  customerName: string;
  phoneE164: string;
  origin: string;
  expiresAt: Date;
  notes: Record<string, string>;
}

/** Makes the Cashfree link, records it, and answers its page. */
async function startCashfreeLink(request: LinkRequest): Promise<string> {
  const link = await createPaymentLink({
    linkId: cashfreeLinkId(request.paymentId),
    amountRupees: request.amountRupees,
    purpose: request.description,
    customerName: request.customerName,
    customerPhone: cashfreeCustomerPhone(request.phoneE164),
    returnUrl: `${request.origin}/api/payments/cashfree/return?payment=${request.paymentId}`,
    notifyUrl: `${request.origin}/api/payments/cashfree`,
    expiresAt: request.expiresAt,
    notes: request.notes,
  });
  await payments.update(request.paymentId, {
    linkUrl: link.link_url,
    ...(link.cf_link_id !== undefined && { cfLinkId: link.cf_link_id }),
  });
  return link.link_url;
}

/**
 * Makes the Razorpay order, records it, and answers what the page needs to
 * open Razorpay's checkout. The webhook URL is set once in Razorpay's
 * dashboard, not per order.
 */
async function startRazorpayOrder(request: LinkRequest): Promise<RazorpayCheckout> {
  const order = await razorpay.createOrder({
    receipt: razorpayReceipt(request.paymentId),
    amountRupees: request.amountRupees,
    notes: request.notes,
  });
  await payments.update(request.paymentId, { razorpayOrderId: order.id });
  return {
    paymentId: request.paymentId,
    keyId: env.razorpay.keyId,
    orderId: order.id,
    amount: order.amount,
    currency: 'INR',
    name: PAYMENT_BRAND,
    description: request.description,
    contact: request.phoneE164,
  };
}

/** The name Razorpay's checkout shows at its top. */
const PAYMENT_BRAND = 'Vivah';

/** The couple's fields a payment notice needs. */
function coupleOf(
  lead: LeadDocument,
): Pick<PaymentNotice, 'bride' | 'groom' | 'nameOrder' | 'phoneE164'> {
  return {
    bride: lead.bride,
    groom: lead.groom,
    phoneE164: lead.phoneE164,
    ...(lead.nameOrder !== undefined && { nameOrder: lead.nameOrder }),
  };
}

/** The coupon line for a payment notice, when the couple used one. */
function couponOf(payment: PaymentPayload): { couponCode?: string } {
  return payment.coupon === undefined ? {} : { couponCode: payment.coupon.code };
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

/** A link's status as either provider reports it, in one shape. */
interface LinkStatus {
  state: 'paid' | 'open' | 'closed';
  /** In rupees. */
  amountPaid: number;
  currency: string;
}

/** The Cashfree link states that will never become PAID. */
const CLOSED_CASHFREE_STATES = new Set(['EXPIRED', 'CANCELLED']);

/** Asks the provider that holds the payment's link for its status. */
async function readLink(paymentId: string, payment: PaymentPayload): Promise<LinkStatus> {
  if (payment.provider === 'razorpay') {
    // An order never expires or closes: unpaid, it stays open.
    if (payment.razorpayOrderId === undefined) {
      return { state: 'open', amountPaid: 0, currency: 'INR' };
    }
    const order = await razorpay.getOrder(payment.razorpayOrderId);
    return {
      state: order.status === 'paid' ? 'paid' : 'open',
      amountPaid: (order.amount_paid ?? 0) / 100,
      currency: order.currency,
    };
  }
  const link = await getPaymentLink(cashfreeLinkId(paymentId));
  return {
    state:
      link.link_status === 'PAID'
        ? 'paid'
        : CLOSED_CASHFREE_STATES.has(link.link_status)
          ? 'closed'
          : 'open',
    amountPaid: link.link_amount_paid ?? link.link_amount,
    currency: link.link_currency ?? 'INR',
  };
}

/**
 * Settles a payment from the provider's own record of its link. The webhook
 * and the return from the provider's page both call this; whichever comes
 * first publishes, and the other finds it done. Safe to call any number of
 * times.
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

  const link = await readLink(paymentId, payment);
  if (link.state !== 'paid') {
    if (link.state === 'closed') {
      await payments.update(paymentId, { status: 'failed' });
      return { state: 'failed', leadId: payment.leadId };
    }
    return { state: 'pending', leadId: payment.leadId };
  }

  const amountPaid = link.amountPaid;
  if (amountPaid < payment.amountRupees || link.currency !== 'INR') {
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
    const fields = {
      paidAt: now,
      paymentId,
      ...(payment.coupon !== undefined && { coupon: payment.coupon }),
    };
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
        ...couponOf(payment),
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
        ...couponOf(payment),
        ...coupleOf(result.lead),
      });
      return { state: 'address-taken', leadId: payment.leadId };
  }
}

/**
 * What Razorpay's checkout handed the page after a payment. The signature is
 * checked first, so a made-up answer costs no call to Razorpay; then the
 * order's own status settles it, as the webhook would. ADR-0012.
 */
export async function confirmRazorpayCheckout(
  paymentId: string,
  answer: { orderId: string; razorpayPaymentId: string; signature: string },
): Promise<CompletePaymentResult | { state: 'bad-signature' }> {
  const payment = await payments.get(paymentId);
  if (payment === null || payment.provider !== 'razorpay') return { state: 'not-found' };
  const signed =
    payment.razorpayOrderId === answer.orderId &&
    razorpayCheckoutSignatureValid(
      answer.orderId,
      answer.razorpayPaymentId,
      answer.signature,
      env.razorpay.keySecret,
    );
  if (!signed) {
    logger.warn('A Razorpay checkout answer failed its signature check', {
      paymentId,
      leadId: payment.leadId,
    });
    return { state: 'bad-signature' };
  }
  return completePayment(paymentId, answer.razorpayPaymentId);
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
export { RazorpayError } from '@/services/razorpay.service';

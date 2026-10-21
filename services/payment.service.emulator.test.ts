// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as EnvModule from '@/lib/env';

/**
 * Settling a payment, against the real Firestore emulator. Cashfree is
 * mocked: the link status it reports is the one input under test. The
 * guarantees (one address, one couple; a second payment never publishes
 * twice) are a transaction's, so Firestore stays real.
 *
 * Skipped without `FIRESTORE_EMULATOR_HOST`. Run with `pnpm test:emulator`.
 */

const active: { provider: 'cashfree' | 'razorpay' } = { provider: 'cashfree' };
vi.mock('@/lib/env', async (importOriginal) => {
  const original = await importOriginal<typeof EnvModule>();
  return {
    env: {
      ...original.env,
      cashfree: { enabled: true, appId: 'TEST', secretKey: 'secret', environment: 'sandbox' },
      razorpay: {
        enabled: true,
        keyId: 'rzp_test_x',
        keySecret: 'secret',
        webhookSecret: 'secret',
        environment: 'sandbox',
      },
      get paymentProvider() {
        return active.provider;
      },
      telegram: { enabled: false, botToken: '', chatId: '' },
    },
  };
});

const link = { status: 'ACTIVE', paid: 0 };
const created: { linkId: string; returnUrl: string }[] = [];
vi.mock('@/services/cashfree.service', () => ({
  CashfreeError: class extends Error {},
  createPaymentLink: (input: { linkId: string; returnUrl: string; amountRupees: number }) => {
    created.push(input);
    return Promise.resolve({
      link_id: input.linkId,
      link_url: `https://payments-test.cashfree.com/links/${input.linkId}`,
      link_status: 'ACTIVE',
      link_amount: input.amountRupees,
      cf_link_id: '123',
    });
  },
  getPaymentLink: (linkId: string) =>
    Promise.resolve({
      link_id: linkId,
      link_url: 'https://payments-test.cashfree.com/links/x',
      link_status: link.status,
      link_currency: 'INR',
      link_amount: 499,
      link_amount_paid: link.paid,
    }),
}));

/** Razorpay's order, in paise as Razorpay counts. */
const order = { status: 'created', paid: 0 };
const createdOrders: { receipt: string }[] = [];
vi.mock('@/services/razorpay.service', () => ({
  RazorpayError: class extends Error {},
  createOrder: (input: { receipt: string }) => {
    createdOrders.push(input);
    return Promise.resolve({
      id: `order_${input.receipt}`,
      status: 'created',
      currency: 'INR',
      amount: 49_900,
    });
  },
  getOrder: (id: string) =>
    Promise.resolve({
      id,
      status: order.status,
      currency: 'INR',
      amount: 49_900,
      amount_paid: order.paid,
    }),
}));

const { createLead, leads, openPreviewLink } = await import('@/services/lead.service');
const { completePayment, confirmRazorpayCheckout, payments, startPayment } =
  await import('@/services/payment.service');
const { getWeddingBySlug, publishWedding } = await import('@/services/wedding.service');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const describeEmulator = emulatorHost === '' ? describe.skip : describe;

function uniqueSlug(label: string): string {
  return `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function openedLead(): Promise<{ id: string; token: string }> {
  const id = await createLead({
    bride: 'Riya',
    groom: 'Arjun',
    weddingDate: null,
    phoneE164: '+919876543210',
    slug: null,
    isBot: false,
  });
  const { newToken } = await openPreviewLink(id, undefined);
  return { id, token: newToken ?? '' };
}

/** Starts a payment and answers its id, from the return URL. */
async function started(leadId: string, slug: string): Promise<string> {
  const result = await startPayment(leadId, slug, 499);
  expect(result.state).toBe('redirect');
  const last = created.at(-1);
  return new URL(last?.returnUrl ?? '').searchParams.get('payment') ?? '';
}

beforeEach(() => {
  active.provider = 'cashfree';
  link.status = 'ACTIVE';
  link.paid = 0;
  order.status = 'created';
  order.paid = 0;
});

describeEmulator('payments (emulator)', () => {
  it('opens a link, waits while unpaid, and publishes once Cashfree says PAID', async () => {
    const slug = uniqueSlug('paid');
    const { id } = await openedLead();
    const paymentId = await started(id, slug);
    expect(await payments.getOrThrow(paymentId)).toMatchObject({ status: 'created', slug });

    expect(await completePayment(paymentId)).toEqual({ state: 'pending', leadId: id });
    expect(await getWeddingBySlug(slug)).toBeNull();

    link.status = 'PAID';
    link.paid = 499;
    expect(await completePayment(paymentId, 'CFPay_1')).toEqual({
      state: 'published',
      leadId: id,
      slug,
    });
    expect(await getWeddingBySlug(slug)).toMatchObject({ slug, leadId: id });
    expect(await leads.getOrThrow(id)).toMatchObject({
      status: 'paid',
      weddingSlug: slug,
      paymentId,
    });
    expect(await payments.getOrThrow(paymentId)).toMatchObject({
      status: 'paid',
      outcome: 'published',
      orderId: 'CFPay_1',
      amountPaid: 499,
    });

    // The webhook and the return both arrive: the second finds it done.
    expect(await completePayment(paymentId)).toEqual({ state: 'published', leadId: id, slug });
  });

  it('never publishes on a short amount', async () => {
    const slug = uniqueSlug('short');
    const { id } = await openedLead();
    const paymentId = await started(id, slug);
    link.status = 'PAID';
    link.paid = 1;
    expect((await completePayment(paymentId)).state).toBe('pending');
    expect(await getWeddingBySlug(slug)).toBeNull();
  });

  it('marks an expired link failed', async () => {
    const { id } = await openedLead();
    const paymentId = await started(id, uniqueSlug('expired'));
    link.status = 'EXPIRED';
    expect(await completePayment(paymentId)).toEqual({ state: 'failed', leadId: id });
    expect(await payments.getOrThrow(paymentId)).toMatchObject({ status: 'failed' });
  });

  it('keeps a second payment for a refund and publishes nothing twice', async () => {
    const slug = uniqueSlug('twice');
    const { id } = await openedLead();
    const first = await started(id, slug);
    const second = await started(id, slug);
    link.status = 'PAID';
    link.paid = 499;
    expect((await completePayment(first)).state).toBe('published');
    expect(await completePayment(second)).toEqual({ state: 'published', leadId: id, slug });
    expect(await payments.getOrThrow(second)).toMatchObject({
      status: 'paid',
      outcome: 'duplicate',
    });
  });

  it('lets a couple who paid for a taken address pick another, free', async () => {
    const slug = uniqueSlug('race');
    const { id } = await openedLead();
    const paymentId = await started(id, slug);

    // Another couple publishes the address while this one is paying.
    const other = await openedLead();
    expect((await publishWedding(other.id, other.token, slug)).state).toBe('published');

    link.status = 'PAID';
    link.paid = 499;
    expect(await completePayment(paymentId)).toEqual({ state: 'address-taken', leadId: id });
    expect(await leads.getOrThrow(id)).toMatchObject({ status: 'paid', paymentId });

    const next = uniqueSlug('next');
    expect(await startPayment(id, next, 499)).toEqual({ state: 'published', slug: next });
    expect(await getWeddingBySlug(next)).toMatchObject({ leadId: id });
  });

  it('settles a Razorpay payment from Razorpay, even after a switch back to Cashfree', async () => {
    active.provider = 'razorpay';
    const slug = uniqueSlug('rzp');
    const { id } = await openedLead();
    const result = await startPayment(id, slug, 499);
    if (result.state !== 'checkout') throw new Error(`Expected a checkout, got ${result.state}`);
    const { paymentId, orderId, amount } = result.checkout;
    expect(orderId).toBe(`order_vivah_${paymentId}`);
    expect(amount).toBe(49_900);
    expect(createdOrders.at(-1)?.receipt).toBe(`vivah_${paymentId}`);
    expect(await payments.getOrThrow(paymentId)).toMatchObject({
      provider: 'razorpay',
      razorpayOrderId: orderId,
    });

    // A made-up checkout answer publishes nothing.
    expect(
      await confirmRazorpayCheckout(paymentId, {
        orderId,
        razorpayPaymentId: 'pay_1',
        signature: 'a'.repeat(64),
      }),
    ).toEqual({ state: 'bad-signature' });

    active.provider = 'cashfree';
    expect((await completePayment(paymentId)).state).toBe('pending');
    order.status = 'paid';
    order.paid = 49_900;
    expect(await completePayment(paymentId, 'pay_1')).toEqual({
      state: 'published',
      leadId: id,
      slug,
    });
    expect(await payments.getOrThrow(paymentId)).toMatchObject({
      status: 'paid',
      amountPaid: 499,
      orderId: 'pay_1',
    });
  });

  it('refuses an address that is taken before any link is made', async () => {
    const slug = uniqueSlug('held');
    const other = await openedLead();
    await publishWedding(other.id, other.token, slug);
    const { id } = await openedLead();
    const before = created.length;
    expect(await startPayment(id, slug, 499)).toEqual({ state: 'taken' });
    expect(created.length).toBe(before);
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PublishOutcome, usePublishInvite } from '@/hooks/usePublishInvite';
import type { RazorpayCheckout } from '@/types/razorpay-checkout';

/**
 * The Razorpay path of the publish step: the checkout opens over the page,
 * a payment confirms and opens the invite, and closing it frees the button.
 * Razorpay's script is replaced by a fake that records its options.
 */

const assign = vi.fn<(url: string) => void>();
const reload = vi.fn<() => void>();
const publish = vi.fn<(leadId: string, slug: string) => Promise<PublishOutcome>>();

interface FakeOptions {
  key: string;
  order_id: string;
  handler: (response: Record<string, string>) => void;
  modal: { ondismiss: () => void };
}

let opened: FakeOptions | null = null;
let failed: ((failure: { error?: { description?: string } }) => void) | null = null;

class FakeRazorpay {
  constructor(private readonly options: FakeOptions) {}
  on(_event: string, handler: (failure: { error?: { description?: string } }) => void): void {
    failed = handler;
  }
  open(): void {
    opened = this.options;
  }
}

const CHECKOUT: RazorpayCheckout = {
  paymentId: 'AbCdEfGhIjKlMnOpQrSt',
  keyId: 'rzp_test_abc',
  orderId: 'order_1',
  amount: 49_900,
  currency: 'INR',
  name: 'Vivah',
  description: 'Wedding invite',
  contact: '+919876543210',
};

beforeEach(() => {
  opened = null;
  failed = null;
  Object.defineProperty(window, 'location', { value: { assign, reload }, configurable: true });
  Object.defineProperty(window, 'Razorpay', { value: FakeRazorpay, configurable: true });
  publish.mockResolvedValue({ ok: true, checkout: CHECKOUT });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function openCheckout() {
  const hook = renderHook(() => usePublishInvite('lead1', publish));
  await act(() => hook.result.current.run('riya-arjun'));
  await waitFor(() => expect(opened).not.toBeNull());
  return hook;
}

describe('usePublishInvite with Razorpay', () => {
  it('opens the checkout for the order, and stays busy while it is open', async () => {
    const hook = await openCheckout();
    expect(opened).toMatchObject({ key: 'rzp_test_abc', order_id: 'order_1' });
    expect(hook.result.current.status).toBe('working');
  });

  it('confirms a payment and opens where the server says', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ url: '/preview/lead1?payment=success' })));
    vi.stubGlobal('fetch', fetchMock);
    await openCheckout();
    act(() => {
      opened?.handler({
        razorpay_payment_id: 'pay_1',
        razorpay_order_id: 'order_1',
        razorpay_signature: 'sig',
      });
    });
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/preview/lead1?payment=success'));
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, string>;
    expect(body).toMatchObject({ paymentId: CHECKOUT.paymentId, razorpay_payment_id: 'pay_1' });
  });

  it('frees the button on close, and says why when a payment failed', async () => {
    const hook = await openCheckout();
    act(() => {
      failed?.({ error: { description: 'Card declined' } });
      opened?.modal.ondismiss();
    });
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.error).toBe(
      'Your payment did not go through: Card declined. Try again.',
    );
  });

  it('frees the button with no message when the couple just closes it', async () => {
    const hook = await openCheckout();
    act(() => opened?.modal.ondismiss());
    expect(hook.result.current.status).toBe('idle');
    expect(hook.result.current.error).toBeNull();
  });
});

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePreviewTracking } from '@/hooks/usePreviewTracking';
import type { RazorpayCheckout, RazorpayCheckoutResponse } from '@/types/razorpay-checkout';

/** What the publish Server Action answers. */
export type PublishOutcome =
  | {
      ok: true;
      url: string;
      /** `payment` when `url` is Cashfree's page, not the live invite. */
      to?: 'payment' | 'invite';
    }
  /** Razorpay: open its checkout over this page. ADR-0012. */
  | { ok: true; checkout: RazorpayCheckout }
  | { ok: false; message: string; taken?: boolean };

/** Razorpay's checkout script. Loaded only when a couple taps Pay. */
const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/** The pay button's colour (`--color-pay-action`), for the checkout's accents. */
const CHECKOUT_COLOUR = '#0b6b4a';

/** How long the confirm call may take. It reads Razorpay's API once. */
const CONFIRM_TIMEOUT_MS = 20_000;

interface RazorpayInstance {
  open: () => void;
  on: (
    event: 'payment.failed',
    handler: (failure: { error?: { description?: string } }) => void,
  ) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Loads the checkout script once. Rejects when the script cannot load. */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay !== undefined) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('The payment window did not load.'));
    };
    document.head.appendChild(script);
  });
}

/** Posts the checkout's answer, and answers where the page goes next. */
async function confirmCheckout(
  paymentId: string,
  response: RazorpayCheckoutResponse,
): Promise<string> {
  const reply = await fetch('/api/payments/razorpay/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, ...response }),
    signal: AbortSignal.timeout(CONFIRM_TIMEOUT_MS),
  });
  const body: unknown = await reply.json().catch(() => null);
  const url =
    typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string'
      ? body.url
      : null;
  if (url === null) throw new Error('Confirming the payment failed.');
  return url;
}

export interface PublishInviteState {
  /** `working` from the tap, `done` once the invite is live and opening. */
  status: 'idle' | 'working' | 'done';
  error: string | null;
  setError: (error: string | null) => void;
  /** Publishes the invite at `slug`. A second call while one runs does nothing. */
  run: (slug: string) => Promise<void>;
}

/**
 * The publish step on the preview page, shared by the pay button in the
 * checkout (`SlugPicker`) and the one on the closed sheet (`PublishBanner`),
 * so both behave the same: one publish at a time, the live invite opens on
 * success, and a failure becomes a sentence the couple can act on.
 *
 * When another couple published the address meanwhile, `onTaken` decides
 * what happens and returns the sentence to show. The default reloads the
 * page, which checks the address again and offers free ones instead.
 */
export function usePublishInvite(
  leadId: string,
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>,
  onTaken?: (message: string) => string,
): PublishInviteState {
  const [status, setStatus] = useState<PublishInviteState['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  // A ref, not the state, so two taps in one frame still publish once.
  const busy = useRef(false);
  const { track } = usePreviewTracking();

  const release = useCallback(() => {
    busy.current = false;
    setStatus('idle');
  }, []);

  /**
   * Opens Razorpay's checkout over the page. The button stays busy while it
   * is open. A payment confirms and opens the invite; closing the window
   * frees the button, with the reason when a payment failed.
   */
  const openCheckout = useCallback(
    async (checkout: RazorpayCheckout): Promise<void> => {
      await loadCheckoutScript();
      const Razorpay = window.Razorpay;
      if (Razorpay === undefined) throw new Error('The payment window did not load.');
      let failure: string | null = null;
      const instance = new Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        prefill: { contact: checkout.contact },
        theme: { color: CHECKOUT_COLOUR },
        handler: (response: RazorpayCheckoutResponse) => {
          track('paid');
          confirmCheckout(checkout.paymentId, response)
            .then((url) => {
              setStatus('done');
              window.location.assign(url);
            })
            .catch(() => {
              // Paid, but the answer did not arrive. The webhook settles it;
              // the preview says the payment is being confirmed.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load re-reads the payment on the server, as the success path does
              window.location.assign(`/preview/${leadId}?payment=pending`);
            });
        },
        modal: {
          ondismiss: () => {
            track(failure === null ? 'checkout-closed' : 'payment-failed');
            setError(failure);
            release();
          },
        },
      });
      instance.on('payment.failed', (event) => {
        failure = `Your payment did not go through${
          event.error?.description === undefined ? '' : `: ${event.error.description}`
        }. Try again.`;
      });
      instance.open();
      track('checkout-opened');
    },
    [leadId, release, track],
  );

  // Back from Cashfree's page, the browser may restore this page from its
  // back-forward cache with the button still busy. Free it again.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      busy.current = false;
      setStatus('idle');
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const run = useCallback(
    async (slug: string): Promise<void> => {
      if (busy.current) return;
      busy.current = true;
      track('pay-tapped');
      setStatus('working');
      setError(null);
      try {
        const result = await publish(leadId, slug);
        if (result.ok && 'checkout' in result) {
          await openCheckout(result.checkout);
          return;
        }
        if (result.ok) {
          // Opening the payment page keeps the button's working words.
          if (result.to !== 'payment') setStatus('done');
          window.location.assign(result.url);
          return;
        }
        if (result.taken === true) {
          if (onTaken === undefined) {
            window.location.reload();
            return;
          }
          setError(onTaken(result.message));
        } else {
          setError(result.message);
        }
      } catch {
        setError('Your invite was not published. Check your connection and try again.');
      }
      busy.current = false;
      setStatus('idle');
    },
    [leadId, publish, onTaken, openCheckout, track],
  );

  return { status, error, setError, run };
}

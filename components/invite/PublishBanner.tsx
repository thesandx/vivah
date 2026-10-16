'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type PublishOutcome, type SlugCheck, SlugPicker } from '@/components/invite/SlugPicker';
import { BrandMark } from '@/components/layout/BrandMark';
import {
  PAPER_CARDS,
  PAYMENT_LIVE,
  PAYMENT_METHODS,
  PAYMENT_PROVIDER,
  REFUND_WINDOW_DAYS,
} from '@/lib/business';
import { cn } from '@/lib/utils';

/**
 * The two payment dialogs at the foot of the couple's preview.
 *
 * Closed, it is a short sheet: what they get, the price once against what
 * paper cards cost, and one green button. It stays short because it sits over
 * the invite the couple is still reading. Open, it is the checkout: what
 * publishing gives them, their address, an order summary, the ways to pay,
 * the pay button, and the refund promise.
 *
 * It is a transaction surface, so it is set apart from the invite behind it:
 * Inter (`font-pay`), neutral greys, and one green action (the `pay-*`
 * tokens). Only the couple's names keep the invite's serif. Every claim on it
 * is true today: the price is `PRICE_FROM_RUPEES` (passed in), the paper-card
 * figures are the home page's, and the refund line is the refund policy's
 * own window. No ratings and no couple counts.
 *
 * While publishing is a test payment (`PAYMENT_LIVE` is false), the button
 * says "Publish", not "Pay", and a line under it says nothing is charged.
 * Setting `PAYMENT_LIVE` removes both.
 *
 * A Client Component for the open state. The address check and the publish
 * are Server Actions the page passes in, through `SlugPicker`.
 */

export interface PublishBannerProps {
  bride: string;
  groom: string;
  leadId: string;
  /** The address the couple chose, checked free just now. */
  chosen?: string;
  /** Free addresses, for when there is no `chosen` one. */
  suggestions: readonly string[];
  /** `vivah.online`. */
  domainLabel: string;
  /** The one-time price, in rupees. */
  priceRupees: number;
  /** Whether the couple chose a song, so the copy only promises what is there. */
  hasSong?: boolean;
  /** Shown above the address when the chosen one was taken meanwhile. */
  notice?: React.ReactNode;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>;
  className?: string;
}

/** What publishing gives the couple, in their words. */
const PROMISES = [
  'Your own address to share on WhatsApp',
  'A personal link for every guest, with their name on the envelope',
  'RSVPs straight to your WhatsApp',
  'Add your venue, time and map any time from your dashboard',
] as const;

function Tick() {
  return (
    <span className="bg-pay-action-soft rounded-pill mt-0.5 inline-grid size-5 shrink-0 place-items-center">
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5" fill="none">
        <path
          d="m5 10.5 3.2 3.2L15 7"
          className="stroke-pay-action"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 shrink-0" fill="none">
      <rect x="4" y="9" width="12" height="8" rx="2" className="stroke-current" strokeWidth="1.8" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" className="stroke-current" strokeWidth="1.8" />
    </svg>
  );
}

function PaymentMethods() {
  return (
    <ul aria-label="Ways to pay" className="flex flex-wrap gap-2">
      {PAYMENT_METHODS.map((method) => (
        <li
          key={method}
          className="border-pay-line text-pay-body rounded-box text-small border-2 px-2 font-semibold"
        >
          {method}
        </li>
      ))}
    </ul>
  );
}

/** The refund promise, from the refund policy, with a link to it. */
function RefundLine({ className }: { className?: string }) {
  return (
    <p className={cn('text-small text-pay-body', className)}>
      <span className="text-pay-ink font-semibold">Changed your mind?</span> Full refund within{' '}
      {REFUND_WINDOW_DAYS} days if you have not shared the invite yet.{' '}
      <Link
        href="/refund-policy"
        target="_blank"
        className="text-pay-ink decoration-pay-line underline decoration-2 underline-offset-2"
      >
        Refund policy
      </Link>
    </p>
  );
}

/** Who takes the money, or, while payment is a test, that nobody does. */
function PaymentNote() {
  if (!PAYMENT_LIVE) {
    return (
      <p className="text-small text-pay-body bg-pay-well rounded-input px-3 py-2 text-center">
        Test payment: payments are not connected yet, so nothing is charged and your invite
        publishes free.
      </p>
    );
  }
  return (
    <p className="text-small text-pay-body flex items-center justify-center gap-1.5">
      <Lock />
      Secure payment · Powered by {PAYMENT_PROVIDER}
    </p>
  );
}

export function PublishBanner({
  bride,
  groom,
  leadId,
  chosen,
  suggestions,
  domainLabel,
  priceRupees,
  hasSong = false,
  notice,
  checkSlug,
  publish,
  className,
}: PublishBannerProps): React.JSX.Element {
  const [open, setOpen] = useState(notice !== undefined);
  const price = `₹${priceRupees.toLocaleString('en-IN')}`;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        // Dims the invite behind the open banner; a tap on it closes the banner.
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="bg-ink/50 animate-fade-in fixed inset-0"
        />
      )}
      <section
        aria-label="Publish your invite"
        className={cn(
          'bg-surface rounded-t-sheet font-pay text-pay-body relative mx-auto flex w-full max-w-xl flex-col px-5 antialiased',
          open ? 'gap-5 py-5' : 'gap-3 pt-5 pb-3',
          open && 'max-h-[90dvh] overflow-y-auto',
          className,
        )}
      >
        {!open ? (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-small text-pay-body flex items-center gap-2 font-semibold">
                <BrandMark className="size-6" />
                {domainLabel}
              </p>
              <h2 className="font-pay text-heading text-pay-ink font-bold tracking-tight">
                Your invite is ready
              </h2>
              <p className="text-small text-pay-body">
                One small step, and every guest opens it with their own name on it.
              </p>
            </div>

            <div className="bg-pay-well border-pay-line rounded-input flex items-end justify-between gap-3 border-2 px-4 py-2">
              <div className="flex flex-col">
                <span className="text-small text-pay-body">One-time payment</span>
                <span className="text-pay-ink tabular-nums">
                  <span className="text-title font-bold tracking-tight">{price}</span>{' '}
                  <span className="text-small text-pay-body">once</span>
                </span>
              </div>
              <div className="text-small text-pay-muted flex flex-col text-right">
                <span>Paper cards cost</span>
                <span className="text-pay-ink font-semibold tabular-nums">{PAPER_CARDS.cost}</span>
                <span>and take {PAPER_CARDS.readyIn}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-pay-action hover:bg-pay-action-deep text-on-brand rounded-input text-body inline-flex min-h-14 w-full items-center justify-center px-5 font-semibold tabular-nums transition-colors select-none active:translate-y-px"
            >
              {PAYMENT_LIVE ? `Continue to payment · ${price}` : 'Continue to publish'}
            </button>

            <div className="text-small text-pay-body flex flex-wrap items-center justify-between gap-x-3">
              <span className="flex items-center gap-1.5">
                {PAYMENT_LIVE && <Lock />}
                {PAYMENT_LIVE && 'Secure payment · '}Paid once · No charge per guest
              </span>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-pay-ink decoration-pay-line inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
              >
                See everything you get
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-jewel-name text-heading text-pay-ink">
                  {bride} &amp; {groom}
                </p>
                <h2 className="font-pay text-title text-pay-ink font-bold tracking-tight">
                  Your invite is ready to publish
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="bg-pay-well text-pay-body hover:text-pay-ink rounded-pill inline-grid size-11 shrink-0 place-items-center"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <p className="text-body text-pay-body">
              {hasSong
                ? 'Everyone you love will open it just as you did: the seal, your song, your day.'
                : 'Everyone you love will open it just as you did: the seal, your names, your day.'}
            </p>

            <ul className="text-body text-pay-ink flex flex-col gap-2.5">
              {PROMISES.map((line) => (
                <li key={line} className="flex gap-3">
                  <Tick />
                  {line}
                </li>
              ))}
            </ul>

            {notice}

            <SlugPicker
              leadId={leadId}
              {...(chosen !== undefined && { chosen })}
              suggestions={suggestions}
              domainLabel={domainLabel}
              checkSlug={checkSlug}
              publish={publish}
              actionLabel={PAYMENT_LIVE ? `Pay ${price} and publish` : 'Publish our invite'}
              workingLabel={PAYMENT_LIVE ? 'Opening payment' : 'Publishing your invite'}
              footer={
                <div className="flex flex-col gap-3">
                  <PaymentNote />
                  <div className="border-pay-line rounded-input border-2 px-4 py-3">
                    <RefundLine />
                  </div>
                </div>
              }
            >
              <dl className="border-pay-line text-body flex flex-col gap-2 border-t-2 pt-4 tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt>Wedding website and invite</dt>
                  <dd className="text-pay-ink">{price}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>A personal link for every guest</dt>
                  <dd className="text-pay-ink">Included</dd>
                </div>
                <div className="border-pay-line text-pay-ink flex justify-between gap-3 border-t-2 pt-3 font-bold">
                  <dt>Total, paid once</dt>
                  <dd className="text-heading">{price}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <p className="text-small text-pay-body">Pay with</p>
                <PaymentMethods />
              </div>
            </SlugPicker>
          </>
        )}
      </section>
    </>
  );
}

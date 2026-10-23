'use client';

import { useEffect, useState } from 'react';

import { type PublishOutcome, type SlugCheck, SlugPicker } from '@/components/invite/SlugPicker';
import { BrandMark } from '@/components/layout/BrandMark';
import { Alert } from '@/components/ui/Alert';
import { usePublishInvite } from '@/hooks/usePublishInvite';
import { PAPER_CARDS, PAYMENT_METHODS } from '@/lib/business';
import { cn } from '@/lib/utils';

/**
 * The two payment dialogs at the foot of the couple's preview.
 *
 * Closed, it is a one-line bar (the price and "Continue") while the couple
 * reads their invite. At the foot of the page it grows to the full sheet: the
 * price against what paper cards cost, one green button and the trust lines.
 * Scrolling up shrinks it back. The green button on either goes straight to
 * payment (the product owner, 2026-10-16): the couple chose their address on
 * the sign-up card, so there is nothing left to ask. Only "See everything you
 * get" opens the checkout: what publishing gives them, their address, an
 * order summary, the pay button, then the ways to pay. The pay button sits
 * above the ways to pay so that a small phone shows it without a scroll. With
 * no chosen address (taken meanwhile), the green button opens the checkout
 * too, where the couple picks one.
 *
 * It is a transaction surface, so it is set apart from the invite behind it:
 * Inter (`font-pay`), neutral greys, and one green action (the `pay-*`
 * tokens). Only the couple's names keep the invite's serif. Every claim on it
 * is true today: the price is `PRICE_FROM_RUPEES` (passed in), and the
 * paper-card figures are `PAPER_CARDS` (the product owner's pick, 2026-10-23). No ratings, no couple counts and no refund
 * promise (the product owner removed it, 2026-10-16).
 *
 * `mode` says what the button does. `live`: it opens Cashfree's page
 * (ADR-0011) or Razorpay's checkout over this page (ADR-0012). `test` (development without payment keys): it publishes free,
 * says "Publish", not "Pay", and a line under it says nothing is charged.
 * `paid`: the couple paid, but their address went to another couple first,
 * so they pick another and publish with nothing more to pay.
 *
 * A Client Component for the open state. The address check and the publish
 * are Server Actions the page passes in, through `SlugPicker`.
 */

export type PaymentBannerMode = 'live' | 'test' | 'paid';

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
  /** What the button does. Default: `test`. */
  mode?: PaymentBannerMode;
  /** Who takes the money when `live`: `Cashfree` or `Razorpay`. */
  providerName?: string;
  className?: string;
}

/** How close to the foot of the page counts as the foot, for the full sheet. */
const FOOT_SLACK_PX = 120;

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

/**
 * The small promises at the foot of the sheet and the checkout, in the
 * product owner's words and emoji (their choice over the "no emoji" rule,
 * 2026-10-16). Each line is true today: links open at once, the invite shows
 * no ads, and the terms keep it live until 12 months after the wedding.
 * "Secure payment" shows only once payment is live.
 */
function TrustLines({ live }: { live: boolean }) {
  return (
    <div className="text-small text-pay-muted flex flex-col items-center gap-1 text-center">
      <p>{live && '🔒 Secure payment · '}⚡ Instant link · 💛 No ads</p>
      <p>📅 Your link stays live until 12 months after your wedding</p>
      <p>Made with love in India 🇮🇳</p>
    </div>
  );
}

/** Who takes the money, or, while payment is a test, that nobody does. */
function PaymentNote({ mode, providerName }: { mode: PaymentBannerMode; providerName?: string }) {
  if (mode === 'paid') {
    return (
      <p className="text-small text-pay-body bg-pay-well rounded-input px-3 py-2 text-center">
        Your payment is received. There is nothing more to pay.
      </p>
    );
  }
  if (mode === 'test') {
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
      Secure payment{providerName !== undefined && ` · Powered by ${providerName}`}
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
  mode = 'test',
  providerName,
  className,
}: PublishBannerProps): React.JSX.Element {
  const live = mode === 'live';
  const [open, setOpen] = useState(notice !== undefined);
  // Closed, the banner is a short bar while the couple reads their invite,
  // and grows to the full sheet once they reach the foot of the page.
  // Scrolling up again shrinks it back.
  const [atFoot, setAtFoot] = useState(false);
  const price = `₹${priceRupees.toLocaleString('en-IN')}`;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const root = document.documentElement;
      setAtFoot(window.innerHeight + window.scrollY >= root.scrollHeight - FOOT_SLACK_PX);
    }
    function onScroll() {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  // The closed sheet's green button pays at once, for the address the couple
  // chose. Without one, it opens the checkout, where they pick an address.
  const direct = usePublishInvite(leadId, publish);
  const directWorking = direct.status !== 'idle';
  function payNow(): void {
    if (chosen === undefined) {
      setOpen(true);
      return;
    }
    void direct.run(chosen);
  }

  const continueLabel = live ? `Continue to payment · ${price}` : 'Continue to publish';
  const directLabel =
    direct.status === 'done'
      ? 'Opening your invite'
      : live
        ? 'Opening payment'
        : 'Publishing your invite';
  const directError = direct.error !== null && (
    <Alert tone="danger" title="Your invite was not published.">
      {direct.error}
    </Alert>
  );
  const spinner = (
    <span
      aria-hidden="true"
      className="border-on-brand/30 border-t-on-brand inline-block size-5 shrink-0 animate-spin rounded-full border-2"
    />
  );

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
          open ? 'gap-5 py-5' : atFoot ? 'gap-3 pt-5 pb-3' : 'py-3',
          open && 'max-h-[90dvh] overflow-y-auto',
          className,
        )}
      >
        {!open && !atFoot ? (
          <div className="animate-fade-in flex flex-col gap-3">
            {directError}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <p className="text-body text-pay-ink font-semibold">Your invite is ready</p>
                <p className="text-small text-pay-body tabular-nums">
                  {price} once · No charge per guest
                </p>
              </div>
              <button
                type="button"
                onClick={payNow}
                disabled={directWorking}
                aria-busy={directWorking}
                aria-label={directWorking ? directLabel : undefined}
                className={cn(
                  'text-on-brand rounded-input text-body inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-5 font-semibold transition-colors select-none',
                  directWorking
                    ? 'bg-pay-action-deep cursor-wait'
                    : 'bg-pay-action hover:bg-pay-action-deep active:translate-y-px',
                )}
              >
                {directWorking && spinner}
                Continue
              </button>
            </div>
          </div>
        ) : !open ? (
          <div className="animate-rise-in flex flex-col gap-3">
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
              <div className="flex shrink-0 flex-col">
                <span className="text-small text-pay-body">One-time payment</span>
                <span className="text-pay-ink tabular-nums">
                  <span className="text-title font-bold tracking-tight">{price}</span>{' '}
                  <span className="text-small text-pay-body">once</span>
                </span>
              </div>
              <div className="text-small text-pay-muted flex flex-col text-right">
                <span>Paper cards cost</span>
                <span className="text-pay-ink font-semibold tabular-nums">
                  {PAPER_CARDS.costFrom}
                </span>
                <span>and take {PAPER_CARDS.readyIn}</span>
              </div>
            </div>

            {directError}

            <button
              type="button"
              onClick={payNow}
              disabled={directWorking}
              aria-busy={directWorking}
              className={cn(
                'text-on-brand rounded-input text-body inline-flex min-h-14 w-full items-center justify-center gap-3 px-5 font-semibold tabular-nums transition-colors select-none',
                directWorking
                  ? 'bg-pay-action-deep cursor-wait'
                  : 'bg-pay-action hover:bg-pay-action-deep active:translate-y-px',
              )}
            >
              {directWorking ? (
                <>
                  {spinner}
                  {directLabel}
                </>
              ) : (
                continueLabel
              )}
            </button>

            <div className="text-small text-pay-body flex flex-wrap items-center justify-between gap-x-3">
              <span className="flex items-center gap-1.5">
                {live && <Lock />}
                {live && 'Secure payment · '}Paid once, nothing more to pay later
              </span>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-pay-ink decoration-pay-line inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
              >
                See everything you get
              </button>
            </div>
            <TrustLines live={live} />
          </div>
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
              actionLabel={live ? `Pay ${price} and publish` : 'Publish our invite'}
              workingLabel={live ? 'Opening payment' : 'Publishing your invite'}
              footer={
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-small text-pay-body">Pay with</p>
                    <PaymentMethods />
                  </div>
                  <PaymentNote mode={mode} {...(providerName !== undefined && { providerName })} />
                  <TrustLines live={live} />
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
            </SlugPicker>
          </>
        )}
      </section>
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type AppliedCouponView,
  type ApplyCouponResult,
  CouponField,
} from '@/components/invite/CouponField';
import { type PublishOutcome, type SlugCheck, SlugPicker } from '@/components/invite/SlugPicker';
import { BrandMark } from '@/components/layout/BrandMark';
import { Alert } from '@/components/ui/Alert';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { usePreviewTracking } from '@/hooks/usePreviewTracking';
import { usePublishInvite } from '@/hooks/usePublishInvite';
import {
  PAPER_CARDS,
  PAYMENT_METHODS,
  percentOffStruck,
  STRUCK_PRICE_RUPEES,
} from '@/lib/business';
import { coupleNames, type NameOrder } from '@/lib/couple-names';
import { cn } from '@/lib/utils';

/**
 * The two payment dialogs at the foot of the couple's preview.
 *
 * Closed, it is a short bar: "Create your personal wedding website", the
 * couple's address, and one green button with the price struck from
 * `STRUCK_PRICE_RUPEES` and the percentage off (the product owner,
 * 2026-10-31). Dragging its handle up, as on an iPhone sheet, or tapping it,
 * opens the full sheet: the price against what paper cards cost, one green
 * button and the trust lines. Dragging down closes it. Scrolling does not
 * open it. The green button on either goes straight to
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
 * paper-card figures are `PAPER_CARDS` (the product owner's pick, 2026-10-23). No star ratings, no couple counts and no refund
 * promise (the product owner removed it, 2026-10-16). Next to the pay button
 * (the product owner, 2026-10-31): up to two real couple reviews from the
 * admin's Home page list (quote and names only), "Free date change once"
 * (the refund policy), "Share with family" and a WhatsApp link to ask before
 * paying.
 *
 * `mode` says what the button does. `live`: it opens Cashfree's page
 * (ADR-0011) or Razorpay's checkout over this page (ADR-0012). `test` (development without payment keys): it publishes free,
 * says "Publish", not "Pay", and a line under it says nothing is charged.
 * `paid`: the couple paid, but their address went to another couple first,
 * so they pick another and publish with nothing more to pay.
 *
 * When live, each view carries the coupon line (`CouponField`, ADR-0015).
 * An applied code shows the list price struck through and the new total;
 * the pay button sends the code, and the server prices the order again.
 *
 * A Client Component for the open state. The address check, the coupon check
 * and the publish are Server Actions the page passes in.
 */

export type PaymentBannerMode = 'live' | 'test' | 'paid';

export interface PublishBannerProps {
  bride: string;
  groom: string;
  /** Whose name comes first. Default: the bride's. */
  nameOrder?: NameOrder | undefined;
  leadId: string;
  /** The address the couple chose, checked free just now. */
  chosen?: string;
  /** Free addresses, for when there is no `chosen` one. */
  suggestions: readonly string[];
  /** `vivah.online`. */
  domainLabel: string;
  /** The one-time list price, in rupees, before any coupon. */
  priceRupees: number;
  /** Whether the couple chose a song, so the copy only promises what is there. */
  hasSong?: boolean;
  /** Shown above the address when the chosen one was taken meanwhile. */
  notice?: React.ReactNode;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  /** Starts the payment. `coupon` is the applied code, when there is one. */
  publish: (leadId: string, slug: string, coupon?: string) => Promise<PublishOutcome>;
  /** Checks a coupon code. Without it, the sheet offers no coupon line. */
  applyCoupon?: (code: string) => Promise<ApplyCouponResult>;
  /** The code the home page ribbon offers, to apply in one tap. */
  couponOffer?: { code: string; percentOff: number };
  /** What the button does. Default: `test`. */
  mode?: PaymentBannerMode;
  /** Who takes the money when `live`: `Cashfree` or `Razorpay`. */
  providerName?: string;
  /** Real couple reviews to show beside the pay button. At most two are shown. */
  reviews?: readonly PayReview[];
  /** A WhatsApp chat with us, with a question about this preview typed in. */
  chatUrl?: string;
  /** A WhatsApp share of this preview's link, for the couple to send to family. */
  shareUrl?: string;
  className?: string;
}

/** A couple review, as the pay sheet shows it. */
export interface PayReview {
  quote: string;
  /** `Riya & Aman`. */
  names: string;
}

/** How far a drag on the handle must travel to open or close the sheet. */
const DRAG_PX = 30;

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
      <p>🔁 Free date change once · 📅 Live until 12 months after your wedding</p>
      <p>Made with love in India 🇮🇳</p>
    </div>
  );
}

/** Up to two real couple reviews, short, beside the pay button. */
function Reviews({ reviews }: { reviews: readonly PayReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <ul aria-label="What couples say" className="flex flex-col gap-2">
      {reviews.slice(0, 2).map((review) => (
        <li
          key={`${review.names}-${review.quote.slice(0, 20)}`}
          className="bg-pay-well rounded-input text-small text-pay-body px-3 py-2"
        >
          <blockquote className="line-clamp-2">“{review.quote}”</blockquote>
          <p className="text-pay-ink font-semibold">{review.names}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Share with family": WhatsApp, in WhatsApp's own green, with the preview
 * link typed in. Family open it without the pay sheet (ADR-0010), and the
 * preview tracker counts them as "other" viewers.
 */
function ShareWithFamily({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-preview-event="family-share-tapped"
      className="bg-whatsapp-deep text-on-brand rounded-input text-body hover:bg-whatsapp inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 font-semibold transition-colors active:translate-y-px"
    >
      <WhatsAppIcon className="size-5" />
      Share with family
    </a>
  );
}

/** "Questions? Chat with us": a WhatsApp chat before paying. */
function ChatLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-preview-event="chat-tapped"
      className="text-small text-pay-ink decoration-pay-line inline-flex min-h-11 items-center justify-center font-semibold underline decoration-2 underline-offset-4"
    >
      Questions before you pay? Chat with us on WhatsApp
    </a>
  );
}

/** One line under the pay button: what the couple has the moment they pay. */
function AfterPaying({ address }: { address: string | null }) {
  return (
    <p className="text-small text-pay-body text-center">
      Right after you pay:{' '}
      {address === null ? (
        'your own link'
      ) : (
        <strong className="text-pay-ink break-all">{address}</strong>
      )}{' '}
      goes live, with a personal link for every guest.
    </p>
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
  nameOrder,
  leadId,
  chosen,
  suggestions,
  domainLabel,
  priceRupees,
  hasSong = false,
  notice,
  checkSlug,
  publish,
  applyCoupon,
  couponOffer,
  mode = 'test',
  providerName,
  reviews = [],
  chatUrl,
  shareUrl,
  className,
}: PublishBannerProps): React.JSX.Element {
  const live = mode === 'live';
  const [coupon, setCoupon] = useState<AppliedCouponView | null>(null);
  const [open, setOpen] = useState(notice !== undefined);
  // Closed, the banner is a short bar. The couple drags its handle up (or
  // taps it) for the full sheet, the way an iPhone sheet opens, and drags it
  // down again to shrink it. Nothing opens it on its own.
  const [expanded, setExpanded] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const listPrice = `₹${priceRupees.toLocaleString('en-IN')}`;
  const payable = coupon?.payableRupees ?? priceRupees;
  const price = `₹${payable.toLocaleString('en-IN')}`;
  const saving =
    coupon === null ? null : `−₹${(priceRupees - coupon.payableRupees).toLocaleString('en-IN')}`;

  // The pay buttons send the applied code. Without one, the call is the
  // same as before coupons existed.
  const publishWithCoupon = useCallback(
    (id: string, slug: string) =>
      coupon === null ? publish(id, slug) : publish(id, slug, coupon.code),
    [publish, coupon],
  );

  const { track } = usePreviewTracking();
  useEffect(() => {
    if (open) track('sheet-opened');
  }, [open, track]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // The closed sheet's green button pays at once, for the address the couple
  // chose. Without one, it opens the checkout, where they pick an address.
  const direct = usePublishInvite(leadId, publishWithCoupon);
  const directWorking = direct.status !== 'idle';

  const couponLine = (className?: string) =>
    live && applyCoupon !== undefined ? (
      <CouponField
        applied={coupon}
        applyCoupon={applyCoupon}
        onApplied={(next) => {
          setCoupon(next);
          direct.setError(null);
        }}
        onRemove={() => {
          setCoupon(null);
          direct.setError(null);
        }}
        {...(couponOffer !== undefined && { offer: couponOffer })}
        disabled={directWorking}
        {...(className !== undefined && { className })}
      />
    ) : null;
  // The struck list price beside a discounted one.
  const wasPrice =
    coupon === null ? null : (
      <s className="text-pay-muted font-normal">
        <span className="sr-only">was </span>
        {listPrice}
      </s>
    );
  function payNow(): void {
    if (chosen === undefined) {
      setOpen(true);
      return;
    }
    void direct.run(chosen);
  }

  const continueLabel = live ? `Make it live · ${price}` : 'Continue to publish';
  const address = chosen === undefined ? null : `${chosen}.${domainLabel}`;
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
          open
            ? 'gap-5 py-5'
            : expanded
              ? 'max-h-[85dvh] gap-3 overflow-y-auto pt-1 pb-3'
              : 'gap-3 pt-1 pb-3',
          open && 'max-h-[90dvh] overflow-y-auto',
          className,
        )}
      >
        {!open && (
          // The drag zone: the handle and, while short, the title. A drag up
          // opens the full sheet, a drag down closes it, and a tap toggles it.
          <div
            className="bg-surface sticky top-0 z-10 touch-none"
            onPointerDown={(event) => {
              // Keep the pointer, so the release counts even when it ends
              // above the sheet.
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragFrom(event.clientY);
            }}
            onPointerUp={(event) => {
              if (dragFrom === null) return;
              const moved = event.clientY - dragFrom;
              setDragFrom(null);
              if (moved < -DRAG_PX) setExpanded(true);
              else if (moved > DRAG_PX) setExpanded(false);
            }}
            onPointerCancel={() => setDragFrom(null)}
          >
            <button
              type="button"
              onClick={() => setExpanded((now) => !now)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Show less' : 'Show everything about publishing'}
              className="flex min-h-11 w-full flex-col items-center gap-1 pt-1"
            >
              <span aria-hidden="true" className="bg-pay-line rounded-pill h-1.5 w-10" />
              {!expanded && (
                <span className="flex flex-col items-center leading-tight">
                  <span className="text-small text-pay-ink font-semibold">
                    Create your personal wedding website
                  </span>
                  <span className="text-small text-pay-body break-all">
                    {address ?? `your own address on ${domainLabel}`}
                  </span>
                </span>
              )}
            </button>
          </div>
        )}
        {!open && !expanded ? (
          <div className="animate-fade-in flex flex-col gap-2">
            {directError}
            <button
              type="button"
              onClick={payNow}
              disabled={directWorking}
              aria-busy={directWorking}
              aria-label={directWorking ? directLabel : continueLabel}
              className={cn(
                'text-on-brand rounded-input inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 font-semibold tabular-nums transition-colors select-none',
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
                <>
                  <span className="text-body">{live ? 'Make it live' : 'Continue'}</span>
                  <s className="text-small font-normal opacity-75">
                    <span className="sr-only">was </span>₹
                    {STRUCK_PRICE_RUPEES.toLocaleString('en-IN')}
                  </s>
                  <span className="text-heading font-bold">{price}</span>
                  {payable < STRUCK_PRICE_RUPEES && (
                    <span className="bg-surface text-pay-action rounded-pill text-small px-2 font-bold">
                      {percentOffStruck(payable)}% OFF
                    </span>
                  )}
                </>
              )}
            </button>
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
                  {wasPrice !== null && <span className="text-body">{wasPrice} </span>}
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

            {couponLine()}

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
            <AfterPaying address={address} />

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
            {shareUrl !== undefined && <ShareWithFamily href={shareUrl} />}
            <Reviews reviews={reviews} />
            {chatUrl !== undefined && <ChatLink href={chatUrl} />}
            <TrustLines live={live} />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-jewel-name text-heading text-pay-ink">
                  {coupleNames({ bride, groom, nameOrder })}
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
              publish={publishWithCoupon}
              actionLabel={live ? `Make it live · ${price}` : 'Publish our invite'}
              workingLabel={live ? 'Opening payment' : 'Publishing your invite'}
              footer={
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-small text-pay-body">Pay with</p>
                    <PaymentMethods />
                  </div>
                  <PaymentNote mode={mode} {...(providerName !== undefined && { providerName })} />
                  <Reviews reviews={reviews} />
                  {chatUrl !== undefined && <ChatLink href={chatUrl} />}
                  <TrustLines live={live} />
                </div>
              }
            >
              <dl className="border-pay-line text-body flex flex-col gap-2 border-t-2 pt-4 tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt>Wedding website and invite</dt>
                  <dd className="text-pay-ink">{listPrice}</dd>
                </div>
                {coupon !== null && (
                  <div className="text-pay-action flex justify-between gap-3 font-semibold">
                    <dt>
                      Coupon {coupon.code} ({coupon.percentOff}% off)
                    </dt>
                    <dd>{saving}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt>A personal link for every guest</dt>
                  <dd className="text-pay-ink">Included</dd>
                </div>
                <div className="border-pay-line text-pay-ink flex justify-between gap-3 border-t-2 pt-3 font-bold">
                  <dt>Total, paid once</dt>
                  <dd className="text-heading">{price}</dd>
                </div>
              </dl>
              {couponLine()}
            </SlugPicker>
          </>
        )}
      </section>
    </>
  );
}

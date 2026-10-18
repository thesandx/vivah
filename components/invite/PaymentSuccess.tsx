'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export interface PaymentSuccessProps {
  /** Where the countdown goes: the couple's live invite. */
  liveUrl: string;
  /** The address as the couple reads it: `riya-arjun.vivah.online`. */
  hostLabel: string;
}

/** How long each step shows before the next, in milliseconds. */
const PAID_MS = 1600;
const CREATING_MS = 1800;
/** The countdown before the live site opens. */
const COUNTDOWN_FROM = 3;

type Step = 'paid' | 'creating' | 'ready';

const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'paid', label: 'Payment successful' },
  { key: 'creating', label: 'Creating your live site' },
  { key: 'ready', label: 'Your live site is ready' },
];

function Tick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The screen after a couple pays (Sandeep, 2026-10-18): "Payment successful",
 * then "Creating your live site", then "Your live site is ready" with a 3, 2,
 * 1 countdown, and the live invite opens.
 *
 * The site is already live when this shows: the return from Cashfree publishes
 * it before redirecting here (ADR-0011). The steps pace the moment so the
 * couple reads each one. "Open it now" skips the wait.
 *
 * It covers the preview, in the payment dialogs' look (`font-pay`, `pay-*`).
 * A Client Component for the timers and the redirect.
 */
export function PaymentSuccess({ liveUrl, hostLabel }: PaymentSuccessProps) {
  const [step, setStep] = useState<Step>('paid');
  const [count, setCount] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    const toCreating = window.setTimeout(() => setStep('creating'), PAID_MS);
    const toReady = window.setTimeout(() => setStep('ready'), PAID_MS + CREATING_MS);
    return () => {
      window.clearTimeout(toCreating);
      window.clearTimeout(toReady);
    };
  }, []);

  useEffect(() => {
    if (step !== 'ready') return;
    if (count <= 0) {
      window.location.assign(liveUrl);
      return;
    }
    const tick = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [step, count, liveUrl]);

  const reached = STEPS.findIndex((candidate) => candidate.key === step);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
      className="bg-surface font-pay text-pay-body animate-fade-in fixed inset-0 z-70 flex flex-col items-center justify-center gap-8 px-6 text-center antialiased"
    >
      <span
        aria-hidden="true"
        className="bg-pay-action text-on-brand rounded-pill animate-pop inline-grid size-20 place-items-center"
      >
        <Tick className="animate-check size-11" />
      </span>

      <div className="flex flex-col gap-2" aria-live="polite">
        <h1 id="payment-success-title" className="text-title text-pay-ink font-bold tracking-tight">
          {step === 'ready' ? 'Your live site is ready 🎉' : STEPS[reached]?.label}
        </h1>
        {step === 'ready' ? (
          <p className="text-body">
            Opening <span className="text-pay-ink font-semibold break-all">{hostLabel}</span> in{' '}
            <span className="text-pay-ink font-bold tabular-nums">{Math.max(count, 1)}</span>
          </p>
        ) : (
          <p className="text-body">Please keep this page open.</p>
        )}
      </div>

      <ol className="flex w-full max-w-xs flex-col gap-3 text-left">
        {STEPS.map((item, index) => {
          // The payment is done from the start; the rest tick as they come.
          const done = index < reached || item.key === 'paid' || step === 'ready';
          const current = index === reached && !done;
          return (
            <li
              key={item.key}
              className={cn(
                'text-body flex items-center gap-3',
                index > reached ? 'text-pay-muted' : 'text-pay-ink font-semibold',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'rounded-pill inline-grid size-7 shrink-0 place-items-center',
                  done ? 'bg-pay-action text-on-brand' : 'bg-pay-well border-pay-line border-2',
                )}
              >
                {done && <Tick className="size-4" />}
                {current && (
                  <span className="border-pay-line border-t-pay-action inline-block size-4 animate-spin rounded-full border-2" />
                )}
              </span>
              {item.label}
            </li>
          );
        })}
      </ol>

      <a
        href={liveUrl}
        className="text-pay-ink decoration-pay-line inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
      >
        Open it now
      </a>
    </div>
  );
}

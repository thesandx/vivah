'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The coupon line on the preview's payment sheet. ADR-0015.
 *
 * Three looks. Closed: one link, "Have a coupon code?", and, when the home
 * page ribbon offers a code, a tap that applies it. Open: a field and an
 * Apply button. Applied: the code and what it takes off, with Remove.
 *
 * The check runs on the server (`applyCoupon`, a Server Action the page
 * passes in through `PublishBanner`). Its answer only changes what the sheet
 * shows: the pay button prices the order again on the server.
 *
 * Uses the payment sheet's `pay-*` tokens, like the rest of `PublishBanner`.
 */

export interface AppliedCouponView {
  code: string;
  percentOff: number;
  payableRupees: number;
}

export type ApplyCouponResult = ({ ok: true } & AppliedCouponView) | { ok: false; message: string };

export interface CouponFieldProps {
  applied: AppliedCouponView | null;
  applyCoupon: (code: string) => Promise<ApplyCouponResult>;
  onApplied: (coupon: AppliedCouponView) => void;
  onRemove: () => void;
  /** The code the home page ribbon offers, to apply in one tap. */
  offer?: { code: string; percentOff: number };
  /** While a payment is starting, nothing here changes. */
  disabled?: boolean;
  className?: string;
}

export function CouponField({
  applied,
  applyCoupon,
  onApplied,
  onRemove,
  offer,
  disabled = false,
  className,
}: CouponFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  async function apply(raw: string): Promise<void> {
    if (checking || disabled) return;
    setChecking(true);
    setError(null);
    try {
      const result = await applyCoupon(raw);
      if (result.ok) {
        onApplied({
          code: result.code,
          percentOff: result.percentOff,
          payableRupees: result.payableRupees,
        });
        setOpen(false);
        setCode('');
      } else {
        setOpen(true);
        setError(result.message);
      }
    } catch {
      setOpen(true);
      setError('We could not check this code. Check your connection and try again.');
    }
    setChecking(false);
  }

  if (applied !== null) {
    return (
      <div
        className={cn(
          'bg-pay-action-soft rounded-input text-small text-pay-ink flex items-center justify-between gap-3 px-3',
          className,
        )}
      >
        <p className="py-2">
          <span className="font-semibold">{applied.code}</span> applied · {applied.percentOff}% off
        </p>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-pay-body hover:text-pay-ink decoration-pay-line inline-flex min-h-11 shrink-0 items-center font-semibold underline decoration-2 underline-offset-4"
        >
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div
        className={cn('text-small flex flex-wrap items-center justify-between gap-x-3', className)}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-pay-ink decoration-pay-line inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
        >
          Have a coupon code?
        </button>
        {offer !== undefined && (
          <button
            type="button"
            onClick={() => void apply(offer.code)}
            disabled={checking || disabled}
            aria-busy={checking}
            className="border-pay-action text-pay-action rounded-pill hover:bg-pay-action-soft inline-flex min-h-11 items-center gap-1.5 border-2 border-dashed px-3 font-semibold"
          >
            Apply {offer.code} · {offer.percentOff}% off
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      className={cn('flex flex-col gap-1.5', className)}
      onSubmit={(event) => {
        event.preventDefault();
        void apply(code);
      }}
    >
      <label htmlFor={inputId} className="text-small text-pay-body">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder={offer?.code ?? 'NEW20'}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
          className="border-pay-line text-pay-ink rounded-input text-body placeholder:text-pay-muted focus:border-pay-ink min-h-12 w-full min-w-0 bg-surface border-2 px-3 font-semibold tracking-wide uppercase outline-none"
        />
        <button
          type="submit"
          disabled={checking || disabled || code.trim() === ''}
          aria-busy={checking}
          className={cn(
            'rounded-input text-body inline-flex min-h-12 shrink-0 items-center justify-center px-4 font-semibold',
            checking || code.trim() === ''
              ? 'bg-pay-disabled text-pay-body'
              : 'bg-pay-ink text-on-brand hover:bg-pay-body',
          )}
        >
          {checking ? 'Checking' : 'Apply'}
        </button>
      </div>
      {error !== null && (
        <p id={errorId} role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

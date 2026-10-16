'use client';

import { useId, useRef } from 'react';

import { controlStyles, FieldError } from '@/components/ui/Field';

/**
 * A one-time code in separate boxes, one digit each: the shape people know
 * from banking and delivery apps.
 *
 * Autofill still works. Every box has `autocomplete="one-time-code"`, so iOS
 * and Android offer the code from the SMS on whichever box has focus. A full
 * code that lands in one box, from autofill or a paste, spreads across all
 * the boxes, and the parent sees it in one `onChange`.
 *
 * The value is the digits typed so far, from the left, with no gaps. Typing
 * in a box past the end writes at the end, so the code is never half-filled
 * in the middle.
 *
 * `'use client'` is justified: focus moves between the boxes as digits land.
 */

export interface OtpInputProps {
  /** Names the group for screen readers: "OTP". */
  label: string;
  /** The digits entered so far, at most `length`. */
  value: string;
  onChange: (value: string) => void;
  /** How many digits the code has. Firebase phone auth sends 6. */
  length?: number;
  error?: string | undefined;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  label,
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const id = useId();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number): void {
    const box = boxes.current[Math.max(0, Math.min(index, length - 1))];
    box?.focus();
    box?.select();
  }

  /** Writes `digits` from box `index` on, then moves focus to the next empty box. */
  function fill(index: number, digits: string): void {
    // A whole code always starts at the first box, wherever the cursor was.
    const start = digits.length >= length ? 0 : Math.min(index, value.length);
    // Typed over a filled box, the digits replace that many and keep the rest.
    const next = (value.slice(0, start) + digits + value.slice(start + digits.length)).slice(
      0,
      length,
    );
    onChange(next);
    focusBox(start + digits.length);
  }

  function remove(index: number): void {
    const at = Math.min(index, value.length - 1);
    if (at < 0) return;
    onChange(value.slice(0, at) + value.slice(at + 1));
    focusBox(at);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p id={`${id}-label`} className="text-small font-medium">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex gap-2 sm:gap-3"
      >
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? '';
          return (
            <input
              key={index}
              ref={(element) => {
                boxes.current[index] = element;
              }}
              aria-label={`Digit ${index + 1} of ${length}`}
              aria-invalid={error ? true : undefined}
              value={digit}
              disabled={disabled}
              inputMode="numeric"
              autoComplete="one-time-code"
              // The first box takes focus; the others are reached by typing.
              autoFocus={autoFocus && index === 0}
              className={controlStyles(
                Boolean(error),
                'font-display text-title h-14 max-w-14 min-w-0 flex-1 px-0 text-center sm:h-16 sm:max-w-16',
              )}
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                let digits = event.target.value.replace(/\D/g, '');
                // A digit typed over a filled box arrives next to the old one.
                if (digits.length === 2 && digit !== '') digits = digits.replace(digit, '');
                if (digits === '') remove(index);
                else fill(index, digits);
              }}
              onPaste={(event) => {
                event.preventDefault();
                const digits = event.clipboardData.getData('text').replace(/\D/g, '');
                if (digits !== '') fill(index, digits);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && digit === '') {
                  event.preventDefault();
                  remove(index - 1);
                } else if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  focusBox(index - 1);
                } else if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  focusBox(Math.min(index + 1, value.length));
                }
              }}
            />
          );
        })}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

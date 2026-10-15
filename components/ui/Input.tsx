import { cn } from '@/lib/utils';

import { controlStyles, Field } from './Field';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Always visible. Placeholder text is never a label. */
  label: string;
  hint?: string;
  /** Says what went wrong and how to fix it: "Keys are 6 letters or numbers". */
  error?: string;
  /** Large, spaced, uppercase entry for room keys and codes. */
  code?: boolean;
  /**
   * Something fixed before the value, inside the field: `+91` before a phone
   * number. Not typed, not submitted.
   */
  prefix?: string;
}

/** What an empty date field shows. iOS Safari shows nothing on its own. */
const DATE_PLACEHOLDER = 'dd/mm/yyyy';

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      className="text-ink pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3.5 10h17M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * One line of text. A `type="date"` field draws its own calendar icon and,
 * when controlled and empty, its own `dd/mm/yyyy`, because iOS Safari shows
 * neither. The layout fix for Safari lives in styles/globals.css.
 */
export function Input({
  label,
  hint,
  error,
  code = false,
  prefix,
  className,
  ...rest
}: InputProps) {
  const isDate = rest.type === 'date';
  const emptyDate = isDate && rest.value === '';

  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => {
        const input = (
          <input
            {...control}
            className={controlStyles(
              Boolean(error),
              cn(
                'min-h-13',
                code && 'font-display text-key min-h-18 text-center tracking-[0.3em] uppercase',
                isDate && 'peer relative pr-12',
                emptyDate && 'focus:text-ink text-transparent',
                prefix !== undefined && 'pl-14',
                className,
              ),
            )}
            {...rest}
          />
        );
        if (!isDate && prefix === undefined) return input;
        return (
          <div className="relative">
            {input}
            {prefix !== undefined && (
              <span
                aria-hidden="true"
                className="text-ink pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-medium"
              >
                {prefix}
              </span>
            )}
            {emptyDate && (
              <span
                aria-hidden="true"
                className="text-ink-soft pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 peer-focus:hidden"
              >
                {DATE_PLACEHOLDER}
              </span>
            )}
            {isDate && <CalendarIcon />}
          </div>
        );
      }}
    </Field>
  );
}

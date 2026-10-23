import { cn } from '@/lib/utils';
import { FESTIVITY_LABELS, FUNCTION_KINDS, type FunctionKind } from '@/lib/wedding-functions';

export interface FunctionChoiceProps {
  /** The group's name, read out with the choices. */
  label: string;
  value: readonly FunctionKind[];
  onChange: (value: FunctionKind[]) => void;
  className?: string;
}

/**
 * The functions a couple is having besides the wedding: tilak, haldi,
 * mehndi, sangeet and reception, as pills to tick. Any number, or none.
 *
 * Native checkboxes under the pills, so a keyboard and a screen reader work
 * as they do with any checkbox. A ticked pill shows a tick as well as its
 * colour, so the state never rests on colour alone. Takes props and fetches
 * nothing, so the sign-up card owns the state.
 */
export function FunctionChoice({ label, value, onChange, className }: FunctionChoiceProps) {
  function toggle(kind: FunctionKind, checked: boolean): void {
    const next = checked ? [...value, kind] : value.filter((entry) => entry !== kind);
    // Kept in the usual order, whatever order they were tapped in.
    onChange(FUNCTION_KINDS.filter((entry) => next.includes(entry)));
  }

  return (
    <fieldset className={cn('flex flex-col gap-3', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap justify-center gap-3">
        {FUNCTION_KINDS.map((kind) => {
          const checked = value.includes(kind);
          return (
            <label
              key={kind}
              className={cn(
                'rounded-pill shadow-hard-sm relative inline-flex min-h-12 cursor-pointer items-center gap-2 border-2 px-5 font-medium transition-colors duration-200',
                'has-focus-visible:outline-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                checked ? 'bg-brand-soft border-brand text-ink' : 'bg-surface border-line text-ink',
              )}
            >
              <input
                type="checkbox"
                name="functions"
                value={kind}
                checked={checked}
                onChange={(event) => toggle(kind, event.target.checked)}
                className="sr-only"
              />
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={cn('stroke-brand size-5', checked ? 'animate-check' : 'hidden')}
                fill="none"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {FESTIVITY_LABELS[kind].name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

export interface MakingProgressProps {
  /** What is being made, as a heading: "Making Raadha & Shyam's website". */
  title: string;
  /** The id the heading takes, so focus can move to it. */
  headingId: string;
  /** The steps in order, in words. */
  steps: readonly string[];
  /** How many steps are complete. The next one is the one in progress. */
  done: number;
}

/**
 * The moment between "submit" and the preview: a short list that ticks off
 * one step at a time, with a bar under it. The card shows it while the server
 * creates the preview, so the wait feels like something is being made.
 */
export function MakingProgress({ title, headingId, steps, done }: MakingProgressProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 id={headingId} tabIndex={-1} className="text-heading text-center outline-none">
        {title}
      </h2>
      <ol className="flex flex-col gap-3" aria-live="polite">
        {steps.map((step, index) => {
          const state = index < done ? 'done' : index === done ? 'now' : 'next';
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 transition-opacity duration-300',
                state === 'next' && 'opacity-40',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'rounded-pill inline-grid size-7 shrink-0 place-items-center border-2',
                  state === 'done' ? 'bg-brand text-on-brand border-transparent' : 'border-line',
                )}
              >
                {state === 'done' ? (
                  <svg viewBox="0 0 24 24" className="animate-check size-4" fill="none">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : state === 'now' ? (
                  <span className="border-sunken border-t-brand size-4 animate-spin rounded-full border-2" />
                ) : null}
              </span>
              <span className={cn(state === 'now' && 'font-medium')}>
                {step}
                {state === 'done' && <span className="sr-only">, done</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <Progress
        label="Your website"
        value={done}
        max={steps.length}
        valueText={`${Math.min(done, steps.length)} of ${steps.length}`}
      />
    </div>
  );
}

import { EnvelopeArt } from '@/components/lead/SignupArt';
import { cn } from '@/lib/utils';

export interface SendMomentProps {
  /** `flying`: the envelope zooms away. `sent`: a tick takes its place. */
  phase: 'flying' | 'sent';
  /** The id the heading takes, so focus can move to it. */
  headingId: string;
  /** The heading once the tick shows. */
  title: string;
  /** One line under the heading. */
  detail: string;
}

/** The speed lines behind the envelope: their offsets from the top, and their lengths. */
const SPEED_LINES = [
  { top: 'top-3', width: 'w-10', delay: '' },
  { top: 'top-7', width: 'w-14', delay: 'delay-75' },
  { top: 'top-11', width: 'w-8', delay: 'delay-150' },
] as const;

/**
 * The end of the sign-up: the envelope zooms off with speed lines behind it,
 * then a tick takes its place. The motion is CSS (`animate-fly-away`,
 * `animate-speed-line`, `animate-pop`); reduced motion skips straight to the
 * tick, because the base layer cuts every animation to its end.
 */
export function SendMoment({ phase, headingId, title, detail }: SendMomentProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="relative grid h-24 w-full place-items-center overflow-hidden">
        {phase === 'flying' ? (
          <div className="relative">
            {SPEED_LINES.map((line) => (
              <span
                key={line.top}
                aria-hidden="true"
                className={cn(
                  'bg-ink rounded-pill animate-speed-line absolute -left-16 h-1 origin-right',
                  line.top,
                  line.width,
                  line.delay,
                )}
              />
            ))}
            <EnvelopeArt className="animate-fly-away" />
          </div>
        ) : (
          <span
            aria-hidden="true"
            className="bg-whatsapp text-on-brand rounded-pill animate-pop inline-grid size-20 place-items-center"
          >
            <svg viewBox="0 0 24 24" className="animate-check size-11" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      <div className={cn('flex flex-col gap-1', phase === 'flying' && 'invisible')}>
        <h2 id={headingId} tabIndex={-1} className="text-heading outline-none" aria-live="polite">
          {phase === 'sent' ? title : ''}
        </h2>
        <p className="text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}

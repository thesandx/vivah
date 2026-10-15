import { THREAD_PATH } from '@/components/lead/HeartThread';
import { SignupButton } from '@/components/lead/SignupButton';
import { cn } from '@/lib/utils';

/**
 * The invitation at the end of a home page section: one line in the words of
 * that section, and a button that opens the sign-up dialog. A small red thread
 * with a heart ties it to the animation the button plays.
 *
 * A Server Component; only the button is client code. Use it inside
 * `SignupDialogProvider`.
 */
export interface SectionCtaProps {
  /** The line, written for the section above it: "Three steps tonight. A lifetime of memories." */
  line: string;
  /** The button label, a verb phrase in the couple's voice: "Begin our forever". */
  action: string;
  className?: string;
}

export function SectionCta({ line, action, className }: SectionCtaProps) {
  return (
    <div
      className={cn(
        'bg-brand-soft rounded-card flex flex-col items-center gap-4 px-5 py-6 text-center',
        'md:flex-row md:gap-6 md:px-8 md:text-left',
        className,
      )}
    >
      <svg viewBox="0 0 600 200" aria-hidden="true" className="h-10 w-28 shrink-0" fill="none">
        <path
          d={THREAD_PATH}
          className="stroke-brand"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-heading max-w-prose md:flex-1">{line}</p>
      <SignupButton className="w-full shrink-0 sm:w-auto">{action}</SignupButton>
    </div>
  );
}

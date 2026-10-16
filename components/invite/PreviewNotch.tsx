import { cn } from '@/lib/utils';

/**
 * The small gold tab that hangs from the top of the screen on the couple's
 * private preview: "Preview · only you can see this". It is the one sign that
 * this is not yet the published invite. A Server Component.
 */

export interface PreviewNotchProps {
  /** The words after "Preview". Default: "only you can see this". */
  note?: string;
  className?: string;
}

/** An eye, for "preview". */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" className="fill-current" />
    </svg>
  );
}

export function PreviewNotch({
  note = 'only you can see this',
  className,
}: PreviewNotchProps): React.JSX.Element {
  return (
    <p
      className={cn(
        'bg-butter text-ink shadow-hard-sm flex items-center gap-2 rounded-b-card px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2',
        className,
      )}
    >
      <EyeIcon />
      <span className="font-display text-small font-semibold tracking-widest uppercase">
        Preview
      </span>
      <span aria-hidden="true">·</span>
      <span className="font-display text-small italic">{note}</span>
    </p>
  );
}

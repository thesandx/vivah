'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The small gold tab that hangs from the top of the screen on the couple's
 * private preview: "Preview · only you can see this", and under it the
 * preview's countdown when one is passed. It is the one sign that this is not
 * yet the published invite.
 *
 * Once the page scrolls, the notch shrinks to one short line: "Preview" and
 * the countdown. The note and the timer's sentence come back at the top of
 * the page. A Client Component, because it listens to the scroll.
 */

export interface PreviewNotchProps {
  /** The words after "Preview". Default: "only you can see this". */
  note?: string;
  /** A second line under the first, such as the countdown. */
  children?: React.ReactNode;
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

/** How far the page scrolls before the notch shrinks. */
const COMPACT_AFTER_PX = 80;

export function PreviewNotch({
  note = 'only you can see this',
  children,
  className,
}: PreviewNotchProps): React.JSX.Element {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > COMPACT_AFTER_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div
      data-compact={compact || undefined}
      className={cn(
        'group bg-butter text-ink shadow-hard-sm rounded-b-card data-compact:rounded-b-pill flex max-w-sm flex-col items-center gap-1 px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 transition-all data-compact:flex-row data-compact:gap-3 data-compact:pb-1.5',
        className,
      )}
    >
      <p className="flex items-center gap-2">
        <EyeIcon />
        <span className="font-display text-small font-semibold tracking-widest uppercase">
          Preview
        </span>
        <span aria-hidden="true" className="group-data-compact:hidden">
          ·
        </span>
        <span className="font-display text-small italic group-data-compact:hidden">{note}</span>
      </p>
      {children}
    </div>
  );
}

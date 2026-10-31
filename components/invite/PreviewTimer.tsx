'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { formatTimeLeft } from '@/lib/preview-timer';

/**
 * The preview's countdown, under "Preview" in the notch: "29:41", and the
 * note to pay before it ends. In the shrunk notch (`PreviewNotch`, once the
 * page scrolls) only the time shows. A Client Component, because it ticks.
 *
 * The end time comes from the server, so a reload or another phone shows the
 * same clock. At zero it refreshes the page, and the server shows the
 * "preview closed" screen instead of the invite. It keeps asking every few
 * seconds in case the phone's clock runs ahead of the server's.
 */

export interface PreviewTimerProps {
  /** When the preview closes, in epoch milliseconds. */
  endsAt: number;
  /** The server's clock when it rendered, so the first render matches it. */
  renderedAt: number;
}

/** How often the page asks the server again after the clock reaches zero. */
const RECHECK_MS = 5000;

export function PreviewTimer({ endsAt, renderedAt }: PreviewTimerProps): React.JSX.Element {
  const router = useRouter();
  const [now, setNow] = useState(renderedAt);
  const left = endsAt - now;
  const over = left <= 0;

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!over) return;
    router.refresh();
    const recheck = window.setInterval(() => router.refresh(), RECHECK_MS);
    return () => window.clearInterval(recheck);
  }, [over, router]);

  return (
    <span className="flex items-center gap-3">
      <span
        role="timer"
        aria-label={`Time left: ${formatTimeLeft(left)}`}
        className="font-display text-heading group-data-compact:text-body font-semibold tabular-nums"
      >
        {formatTimeLeft(left)}
      </span>
      <span className="text-small leading-snug group-data-compact:hidden">
        Complete payment within 30 minutes. This link is disabled after that.
      </span>
    </span>
  );
}

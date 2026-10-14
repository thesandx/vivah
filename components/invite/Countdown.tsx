'use client';

import { useEffect, useState } from 'react';

import { countdownParts } from '@/lib/wedding-date';

/**
 * Days, hours, minutes and seconds to the wedding. A Client Component: it
 * ticks every second.
 *
 * The server does not know the guest's clock, so the first render shows
 * dashes and the numbers appear after hydration. That keeps the server and
 * browser output equal.
 */

export interface CountdownProps {
  /** The start, in milliseconds since the epoch (`weddingStartsAt`). */
  target: number;
}

const UNITS = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
] as const;

export function Countdown({ target }: CountdownProps): React.JSX.Element {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const parts = now === null ? null : countdownParts(target, now);

  if (now !== null && parts === null) {
    return (
      <p className="font-script text-title text-brand text-center">
        Bless the married couple with a happy life!
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="font-script text-title text-brand">Our forever starts in…</p>
      <dl className="grid w-full max-w-sm grid-cols-4 gap-2 sm:gap-3">
        {UNITS.map(([key, label]) => (
          <div
            key={key}
            className="border-butter bg-surface flex flex-col items-center gap-1 rounded-input border-2 py-3"
          >
            <dt className="text-small text-ink-soft order-last">{label}</dt>
            <dd className="font-display text-title text-brand tabular-nums">
              {parts === null ? '–' : parts[key]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

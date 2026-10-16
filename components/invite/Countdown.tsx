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
  ['minutes', 'Mins'],
  ['seconds', 'Secs'],
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
    <dl className="grid w-full max-w-sm grid-cols-4 gap-2 sm:gap-4">
      {UNITS.map(([key, label]) => (
        <div key={key} className="flex flex-col items-center gap-2">
          <dt className="font-display text-small text-gold order-last tracking-widest uppercase">
            {label}
          </dt>
          <dd className="font-display text-key text-ink flex flex-col items-center gap-2 lining-nums tabular-nums">
            {parts === null ? '–' : String(parts[key]).padStart(2, '0')}
            <span aria-hidden="true" className="bg-brand-soft block h-0.5 w-10 rounded-pill" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

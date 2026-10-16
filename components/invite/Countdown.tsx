'use client';

import { useEffect, useState } from 'react';

import { countdownParts } from '@/lib/wedding-date';

/**
 * "Our forever starts in…" with the days, hours, minutes and seconds to the
 * wedding. Once the wedding has started, a blessing takes its place: one or
 * the other, never both. A Client Component: it ticks every second.
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
    return <p className="jewel-count-label">Bless the married couple with a happy life!</p>;
  }

  return (
    <>
      <p className="jewel-count-label">Our forever starts in…</p>
      <dl className="flex justify-center gap-2.5">
        {UNITS.map(([key, label]) => (
          <div key={key} className="jewel-count-cell flex flex-col items-center">
            <dt className="jewel-count-u order-last">{label}</dt>
            <dd className="jewel-count-n lining-nums tabular-nums">
              {parts === null
                ? '–'
                : key === 'days'
                  ? parts[key]
                  : String(parts[key]).padStart(2, '0')}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

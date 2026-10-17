'use client';

import { useRef, useState } from 'react';

import { ConfettiBurst } from '@/components/invite/ConfettiBurst';
import { ScratchCard } from '@/components/invite/ScratchCard';

/**
 * The three scratch cards under "Save the Date": the day, the month and the
 * year. When the guest has revealed all three, the date is out, and confetti
 * bursts from the middle of the cards (`ConfettiBurst`).
 *
 * A Client Component only to count the reveals. The invite around it stays a
 * Server Component, and each card's value is still in the server HTML.
 */

export interface SaveTheDateCardsProps {
  day: string;
  /** The month as two digits, e.g. `12`. */
  month: string;
  /** The year as two digits, e.g. `26`. */
  year: string;
}

const CARDS = 3;

export function SaveTheDateCards({ day, month, year }: SaveTheDateCardsProps): React.JSX.Element {
  const row = useRef<HTMLDivElement>(null);
  const revealed = useRef(0);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);

  function onReveal(): void {
    revealed.current += 1;
    if (revealed.current !== CARDS || row.current === null) return;
    const box = row.current.getBoundingClientRect();
    setBurst({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
  }

  return (
    <div ref={row} className="mt-9 flex justify-center gap-3.25">
      <ScratchCard label="Day" value={day} className="jewel-scratch-day" onReveal={onReveal} />
      <ScratchCard
        label="Month"
        value={month}
        className="jewel-scratch-month"
        onReveal={onReveal}
      />
      <ScratchCard label="Year" value={year} className="jewel-scratch-year" onReveal={onReveal} />
      {burst !== null && <ConfettiBurst origin={burst} onDone={() => setBurst(null)} />}
    </div>
  );
}

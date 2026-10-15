import { cn } from '@/lib/utils';

/**
 * A toran: the marigold garland hung across a doorway for a wedding. It runs
 * across the top of the invite. A Server Component, drawn in SVG, so it costs
 * no image download and takes the theme's colours.
 *
 * Strands alternate long and short. Fewer strands show on a phone, so the
 * flowers stay their size instead of shrinking.
 */

/** Flowers per strand, long and short. */
const LONG = 5;
const SHORT = 3;
const FLOWER_GAP = 18;

function Marigold({ cy }: { cy: number }) {
  return (
    <g>
      <circle
        cx="12"
        cy={cy}
        r="8"
        className="fill-peach stroke-peach"
        strokeWidth="3"
        strokeDasharray="2.4 1.6"
      />
      <circle cx="12" cy={cy} r="5" className="fill-brand-soft" />
      <circle cx="12" cy={cy} r="1.8" className="fill-butter" />
    </g>
  );
}

function Strand({ flowers, className }: { flowers: number; className?: string }) {
  const height = 14 + flowers * FLOWER_GAP + 16;
  return (
    <svg
      viewBox={`0 0 24 ${height}`}
      width="24"
      height={height}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <line x1="12" y1="0" x2="12" y2={height - 16} className="stroke-butter" strokeWidth="1.2" />
      {Array.from({ length: flowers }, (_, index) => (
        <Marigold key={index} cy={14 + index * FLOWER_GAP} />
      ))}
      {/* A mango leaf closes the strand. */}
      <path
        d={`M12 ${height - 18} C 4 ${height - 10}, 8 ${height - 2}, 12 ${height} C 16 ${height - 2}, 20 ${height - 10}, 12 ${height - 18} Z`}
        className="fill-soda"
      />
    </svg>
  );
}

export interface ToranProps {
  className?: string;
}

export function Toran({ className }: ToranProps) {
  // 13 strands; the outer four hide on a phone so the rest keep their size.
  const strands = Array.from({ length: 13 }, (_, index) => index);
  return (
    <div aria-hidden="true" className={cn('pointer-events-none w-full', className)}>
      <div className="bg-butter h-1 w-full" />
      <div className="flex justify-between px-2">
        {strands.map((index) => (
          <Strand
            key={index}
            flowers={index % 2 === 0 ? LONG : SHORT}
            className={cn((index < 2 || index > 10) && 'hidden sm:block')}
          />
        ))}
      </div>
    </div>
  );
}

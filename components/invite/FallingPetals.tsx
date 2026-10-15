import { cn } from '@/lib/utils';

/**
 * Marigold petals drifting down behind the invite, as in the couple's own
 * site. A Server Component: CSS animates them, so no JavaScript ships.
 *
 * The petals are fixed in the source, not random, so the server and the
 * browser draw the same page. Reduced motion stops them (`globals.css`).
 */

/** left (% of width), delay (s), duration (s), size (px), colour. */
const PETALS: readonly (readonly [number, number, number, number, number])[] = [
  [4, 0, 13, 12, 0],
  [12, 5, 16, 10, 1],
  [21, 9, 12, 14, 2],
  [30, 2, 15, 10, 0],
  [38, 11, 14, 12, 1],
  [47, 6, 17, 9, 2],
  [55, 1, 13, 13, 0],
  [63, 8, 15, 11, 1],
  [71, 3, 12, 10, 2],
  [79, 12, 16, 14, 0],
  [87, 7, 14, 10, 1],
  [94, 4, 13, 12, 2],
];

const COLOURS = ['fill-peach', 'fill-brand-soft', 'fill-butter'] as const;

export interface FallingPetalsProps {
  className?: string;
}

export function FallingPetals({ className }: FallingPetalsProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {PETALS.map(([left, delay, duration, size, colour]) => (
        <svg
          key={`${left}-${delay}`}
          viewBox="0 0 10 14"
          width={size}
          height={size * 1.4}
          className="animate-petal-fall absolute top-0 opacity-80"
          style={{
            left: `${left}%`,
            animationDelay: `-${delay}s`,
            animationDuration: `${duration}s`,
          }}
        >
          <path d="M5 0 C 10 4, 9 11, 5 14 C 1 11, 0 4, 5 0 Z" className={COLOURS[colour]} />
        </svg>
      ))}
    </div>
  );
}

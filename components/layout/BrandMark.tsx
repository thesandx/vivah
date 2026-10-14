import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  className?: string;
}

/**
 * The vivah.online mark: a heart inside a ring of marigold petals, in rose and
 * gold. Decorative: the brand name beside it is the accessible name. The same
 * drawing is the favicon, `app/icon.svg`.
 */
export function BrandMark({ className }: BrandMarkProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn('size-10 shrink-0', className)}>
      <g className="fill-butter">
        {Array.from({ length: 12 }, (_, petal) => (
          <ellipse
            key={petal}
            cx="24"
            cy="6.5"
            rx="3.6"
            ry="5.5"
            transform={`rotate(${petal * 30} 24 24)`}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="14" className="fill-brand-soft stroke-butter" strokeWidth="1.5" />
      <path
        d="M24 32.5s-8.5-5.2-8.5-11a4.6 4.6 0 0 1 8.5-2.5 4.6 4.6 0 0 1 8.5 2.5c0 5.8-8.5 11-8.5 11Z"
        className="fill-brand stroke-ink"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

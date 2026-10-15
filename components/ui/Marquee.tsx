import { cn } from '@/lib/utils';

export interface MarqueeItem {
  /** A stable key for the item. */
  key: string;
  node: React.ReactNode;
}

export interface MarqueeProps {
  items: readonly MarqueeItem[];
  /** What the row holds, for screen readers, such as `Reviews from couples`. */
  label: string;
  /** Drift to the right instead of the left. Two rows that drift apart read better. */
  reverse?: boolean;
  className?: string;
}

/**
 * A row of cards that drifts slowly sideways and loops without end. CSS only,
 * so it is a Server Component and costs no JavaScript.
 *
 * The track holds the list twice and moves by half its width, so the second
 * copy takes the place of the first with no seam. The copy is `inert` and
 * hidden from screen readers, so each card is read and focused once.
 *
 * It stops while a pointer is on it or a card has focus. With reduced motion
 * it does not move: the copy hides and the row scrolls by hand instead.
 */
export function Marquee({ items, label, reverse = false, className }: MarqueeProps) {
  const list = (copy: boolean) => (
    <ul
      className={cn('flex shrink-0', copy && 'motion-reduce:hidden')}
      {...(copy && { 'aria-hidden': true, inert: true })}
    >
      {items.map((item) => (
        // Padding, not a gap, so both copies are the same width and the loop
        // lands exactly on its start.
        <li key={item.key} className="shrink-0 pr-5">
          {item.node}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      role="region"
      aria-label={label}
      className={cn('marquee-pause overflow-hidden py-4 motion-reduce:overflow-x-auto', className)}
    >
      <div className={cn('flex w-max', reverse ? 'animate-marquee-reverse' : 'animate-marquee')}>
        {list(false)}
        {list(true)}
      </div>
    </div>
  );
}

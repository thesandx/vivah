import Image from 'next/image';

import { Skeleton } from '@/components/ui/Skeleton';
import { isPublishedReview, type Review } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

export interface ReviewCardProps {
  review: Review;
  className?: string;
}

function Stars({ count }: { count: number | null }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" className="size-4">
          <path
            d="m10 1.5 2.6 5.6 6 .7-4.5 4.1 1.2 6L10 15l-5.3 2.9 1.2-6L1.4 7.8l6-.7Z"
            className={cn(
              'stroke-butter',
              count !== null && index < count ? 'fill-butter' : 'fill-transparent',
            )}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * One card in the home page's review carousel: the couple's photo, their
 * stars and their words. A Server Component.
 *
 * An entry with no words yet shows as an open slot, with empty stars, so the
 * page never claims a review that nobody wrote. See `lib/testimonials.ts`.
 */
export function ReviewCard({ review, className }: ReviewCardProps) {
  const published = isPublishedReview(review);

  return (
    <figure
      className={cn(
        'bg-surface shadow-hard rounded-card flex w-64 flex-col overflow-hidden sm:w-72',
        className,
      )}
    >
      <div className="bg-brand-soft relative aspect-4/3">
        {review.image !== null ? (
          <Image
            src={review.image}
            alt={published ? `${review.names} at their wedding` : ''}
            fill
            sizes="288px"
            className="object-cover"
          />
        ) : (
          // Two wedding rings, until the couple's photo arrives.
          <svg viewBox="0 0 64 40" aria-hidden="true" className="size-full p-12">
            <circle cx="24" cy="22" r="13" className="stroke-butter fill-none" strokeWidth="3" />
            <circle cx="40" cy="22" r="13" className="stroke-butter fill-none" strokeWidth="3" />
            <path d="m40 5 3 3-3 3-3-3Z" className="fill-surface stroke-butter" strokeWidth="1.2" />
          </svg>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <Stars count={published ? review.stars : null} />
        {published ? (
          <>
            {review.stars !== null && (
              <span className="sr-only">{review.stars} out of 5 stars</span>
            )}
            <blockquote className="text-body">“{review.quote}”</blockquote>
            <figcaption className="text-small text-ink-soft font-semibold">
              {review.names}
              {review.city !== null && `, ${review.city}`}
            </figcaption>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2" aria-hidden="true">
              <Skeleton className="w-full" />
              <Skeleton className="w-11/12" />
              <Skeleton className="w-2/3" />
            </div>
            <figcaption className="text-small text-ink-soft">
              Kept for one of our first couples
            </figcaption>
          </>
        )}
      </div>
    </figure>
  );
}

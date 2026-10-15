import { cn } from '@/lib/utils';

export interface CoupleReviewCardProps {
  quote: string;
  names: string;
  /** Who wrote it, such as `Bride and groom`. `''` for none. */
  relation: string;
  /** 1 to 5. */
  stars: number;
  /** The couple's photo URL. */
  image: string;
  className?: string;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex justify-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" className="size-4">
          <path
            d="m10 1.5 2.6 5.6 6 .7-4.5 4.1 1.2 6L10 15l-5.3 2.9 1.2-6L1.4 7.8l6-.7Z"
            className={cn('stroke-butter', index < count ? 'fill-butter' : 'fill-transparent')}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * One card in the home page's "From our couples" row: the couple's photo,
 * with their stars, their words and their names over the bottom of it. A
 * dark fade under the words keeps them readable on any photo. A Server
 * Component.
 */
export function CoupleReviewCard({
  quote,
  names,
  relation,
  stars,
  image,
  className,
}: CoupleReviewCardProps): React.JSX.Element {
  return (
    <figure
      className={cn(
        'bg-sunken shadow-hard rounded-card relative isolate flex aspect-2/3 w-64 flex-col justify-end overflow-hidden sm:w-72',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route with a year-long cache; the admin page already shrank it */}
      <img
        src={image}
        alt={`${names}${relation === '' ? '' : `, ${relation}`}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div className="from-ink via-ink/85 text-on-brand flex flex-col gap-3 bg-linear-to-t to-transparent px-5 pt-32 pb-6 text-center">
        <Stars count={stars} />
        <span className="sr-only">{stars} out of 5 stars</span>
        <blockquote className="line-clamp-6 font-semibold">{quote}</blockquote>
        <figcaption className="flex flex-col">
          <span className="font-weighted font-bold">{names}</span>
          {relation !== '' && <span className="text-small opacity-80">({relation})</span>}
        </figcaption>
      </div>
    </figure>
  );
}

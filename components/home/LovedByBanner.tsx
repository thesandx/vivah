import { splitHeadline } from '@/lib/testimonials';

export interface LovedByBannerProps {
  /** The admin's line, such as `Loved by 500+ happy couples`. Never empty. */
  headline: string;
}

/**
 * The home page's dark banner with one gold line, such as "Loved by 500+
 * happy couples". The number in the line stands out. It shows only when the
 * admin has set the line, so it never claims a count nobody checked. A
 * Server Component.
 */
export function LovedByBanner({ headline }: LovedByBannerProps): React.JSX.Element {
  const { before, highlight, after } = splitHeadline(headline);

  return (
    <section
      aria-label="Our couples"
      className="bg-ink rounded-sheet border-gold shadow-hard-lg relative isolate flex flex-col items-center gap-4 overflow-hidden border-2 px-6 py-10 text-center sm:py-12"
    >
      {/* Two soft gold glows in the corners, like light on foil. */}
      <span
        aria-hidden="true"
        className="bg-gold/25 absolute -top-16 -right-16 -z-10 size-48 rounded-full blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-gold/20 absolute -bottom-16 -left-16 -z-10 size-48 rounded-full blur-3xl"
      />
      <p className="text-title sm:text-hero font-weighted text-butter font-bold">
        {before}
        {highlight !== '' && (
          <span className="decoration-gold underline decoration-2 underline-offset-8">
            {highlight}
          </span>
        )}
        {after}
      </p>
      <span aria-hidden="true" className="bg-gold h-0.5 w-16" />
    </section>
  );
}

import { cn } from '@/lib/utils';

export interface HowTo {
  /** The section's anchor, such as `edit-details`. */
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  steps: readonly string[];
  tips: readonly string[];
  /** Names the video for a screen reader. */
  videoLabel: string;
}

export interface HowToSectionProps {
  howTo: HowTo;
  /** The uploaded walkthrough, or `null` to show the steps alone. */
  video: {
    /** A signed URL that plays at once. */
    src: string;
    /** A URL that signs a fresh one, for when `src` has expired. */
    fallbackSrc: string;
    /** The poster image URL. Empty for none. */
    poster: string;
  } | null;
}

/**
 * One how-to on `/help`: numbered steps, tips, and the walkthrough video
 * beside them from `lg` up (below them on a phone). A Server Component.
 *
 * The video has `preload="none"`, so the page loads only the poster until
 * the visitor presses play. It has two sources: when the signed URL has
 * expired, such as on a tab left open overnight, the browser falls through
 * to the route that signs a fresh one. So it needs no script.
 */
export function HowToSection({ howTo, video }: HowToSectionProps): React.JSX.Element {
  const headingId = `${howTo.id}-heading`;
  return (
    <section
      id={howTo.id}
      aria-labelledby={headingId}
      className={cn(
        'grid scroll-mt-24 gap-8',
        video !== null && 'lg:grid-cols-2 lg:items-start lg:gap-x-12',
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex max-w-prose flex-col gap-3">
          <p className="bg-brand-soft rounded-pill text-small self-start px-4 py-1.5 font-semibold">
            {howTo.eyebrow}
          </p>
          <h2 id={headingId} className="text-title">
            {howTo.title}
          </h2>
          <p className="text-ink-soft">{howTo.intro}</p>
        </div>
        <ol className="flex max-w-prose flex-col gap-4">
          {howTo.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="bg-brand-soft rounded-pill font-weighted flex size-7 shrink-0 items-center justify-center"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <ul className="text-ink-soft flex max-w-prose list-disc flex-col gap-2 pl-6">
          {howTo.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      {video !== null && (
        // The steps beside it say what the video shows, so it needs no captions file.
        <video
          controls
          playsInline
          preload="none"
          {...(video.poster !== '' && { poster: video.poster })}
          width={720}
          height={1280}
          aria-label={howTo.videoLabel}
          className="bg-sunken rounded-card shadow-hard mx-auto aspect-9/16 w-full max-w-72 lg:sticky lg:top-24"
        >
          <source src={video.src} type="video/mp4" />
          <source src={video.fallbackSrc} type="video/mp4" />
          <p>Your browser cannot play this video. The steps say the same.</p>
        </video>
      )}
    </section>
  );
}

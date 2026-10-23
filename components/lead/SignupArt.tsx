import { cn } from '@/lib/utils';

/**
 * The drawings on the sign-up card. Each one is decoration: the words around
 * it carry the meaning, so every drawing is hidden from screen readers.
 * Colours come from the tokens, through `fill-*` and `stroke-*` utilities.
 */

const HEART_PATH =
  'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z';

export interface ArtProps {
  className?: string;
}

/** A small heart, for the space between two names. */
export function HeartGlyph({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('fill-brand inline-block size-5', className)}
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

/** Step 1: two hearts, a big rose one and a small marigold one. */
export function HeartsArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden="true" className={cn('h-14 w-16', className)}>
      <g
        transform="translate(26 2) scale(1.4)"
        className="fill-peach stroke-surface"
        strokeWidth="1.6"
      >
        <path d={HEART_PATH} />
      </g>
      <g
        transform="translate(2 12) scale(1.75)"
        className="fill-brand stroke-surface"
        strokeWidth="1.4"
      >
        <path d={HEART_PATH} />
      </g>
    </svg>
  );
}

const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

/**
 * Step 2: a desk calendar. Once a couple picks their day, the page shows that
 * month and day, so the drawing answers what they typed.
 */
export function CalendarArt({ isoDate, className }: ArtProps & { isoDate: string | null }) {
  const date = isoDate === null ? null : new Date(`${isoDate}T00:00:00Z`);
  const valid = date !== null && !Number.isNaN(date.getTime());

  return (
    <svg viewBox="0 0 56 56" aria-hidden="true" className={cn('size-14', className)}>
      <rect
        x="4"
        y="8"
        width="48"
        height="44"
        rx="10"
        className="fill-surface stroke-line"
        strokeWidth="2"
      />
      <path d="M4 18a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v4H4z" className="fill-brand" />
      <rect x="15" y="3" width="4" height="10" rx="2" className="fill-ink" />
      <rect x="37" y="3" width="4" height="10" rx="2" className="fill-ink" />
      {valid ? (
        <>
          <text
            x="28"
            y="19"
            textAnchor="middle"
            className="fill-on-brand font-weighted"
            fontSize="8"
            fontWeight="700"
          >
            {MONTH.format(date).toUpperCase()}
          </text>
          <text
            x="28"
            y="44"
            textAnchor="middle"
            className="fill-ink font-weighted"
            fontSize="20"
            fontWeight="700"
          >
            {date.getUTCDate()}
          </text>
        </>
      ) : (
        <g transform="translate(18 26) scale(0.85)" className="fill-brand">
          <path d={HEART_PATH} />
        </g>
      )}
    </svg>
  );
}

/** Step 4: a browser window with a heart, for the website's own address. */
export function AddressArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 52" aria-hidden="true" className={cn('h-14 w-16', className)}>
      <rect
        x="3"
        y="3"
        width="58"
        height="46"
        rx="8"
        className="fill-surface stroke-ink"
        strokeWidth="3"
      />
      <path d="M3 17h58" className="stroke-ink" strokeWidth="3" />
      <circle cx="11" cy="10" r="2.2" className="fill-brand" />
      <circle cx="18" cy="10" r="2.2" className="fill-peach" />
      <rect x="25" y="7.5" width="30" height="5" rx="2.5" className="fill-sunken" />
      <g transform="translate(20.5 21) scale(0.95)" className="fill-brand">
        <path d={HEART_PATH} />
      </g>
    </svg>
  );
}

/** Step 3: a diya beside a marigold, for the functions round the wedding. */
export function FestivitiesArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden="true" className={cn('h-14 w-16', className)}>
      <path
        d="M4 36h30c-1.2 7-7.3 11-15 11S5.2 43 4 36Z"
        className="fill-peach stroke-ink"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M19 14c4 4.4 5 7.6 5 10a5 5 0 0 1-10 0c0-2.4 1-5.6 5-10Z"
        className="fill-butter stroke-ink"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g transform="translate(46 26)">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-8"
            rx="4.6"
            ry="7"
            transform={`rotate(${angle})`}
            className="fill-brand stroke-ink"
            strokeWidth="2.4"
          />
        ))}
        <circle r="4.4" className="fill-butter stroke-ink" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/** Step 5: two music notes with a small heart, for the couple's song. */
export function SongArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden="true" className={cn('h-14 w-16', className)}>
      <path
        d="M22 40V12l28-6v28"
        className="stroke-ink"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 20l28-6" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="16" cy="41" rx="7" ry="5.5" className="fill-brand stroke-ink" strokeWidth="3" />
      <ellipse cx="44" cy="35" rx="7" ry="5.5" className="fill-peach stroke-ink" strokeWidth="3" />
      <g transform="translate(46 40) scale(0.55)" className="fill-brand">
        <path d={HEART_PATH} />
      </g>
    </svg>
  );
}

/** The envelope that zooms off once the website is made. */
export function EnvelopeArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 44" aria-hidden="true" className={cn('h-16 w-24', className)}>
      <rect
        x="3"
        y="3"
        width="58"
        height="38"
        rx="6"
        className="fill-surface stroke-ink"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M5 6l27 20L59 6"
        className="stroke-ink"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 38l19-15M59 38L40 23"
        className="stroke-ink"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g transform="translate(26.5 26) scale(0.45)" className="fill-brand">
        <path d={HEART_PATH} />
      </g>
    </svg>
  );
}

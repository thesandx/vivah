import { isGoogleMapsUrl } from '@/lib/invite-contact';
import { cn } from '@/lib/utils';
import { formatWeddingTime } from '@/lib/wedding-date';
import {
  type Festivity,
  FESTIVITY_LABELS,
  type FestivityKind,
  formatFestivityDate,
} from '@/lib/wedding-functions';

/**
 * The invite's "Wedding Festivities" section, to the product owner's design:
 * a card for each function (tilak, haldi, mehndi, sangeet, reception) and
 * the wedding, on a gold timeline, each in its own jewel tone. Each card
 * shows the time, the day, the venue and a Directions link.
 *
 * The caller passes the cards already sorted (`festivityCards`), and passes
 * none when the couple chose no function: then nothing renders, so the
 * wedding never shows here alone.
 *
 * A Server Component. The tones and sizes are the `jewel-fn-*` utilities in
 * `styles/globals.css`.
 */

export interface WeddingFestivitiesProps {
  /** The cards, in order. Empty renders nothing. */
  cards: readonly Festivity[];
  /**
   * The unpaid preview: a detail not added yet shows as a faint placeholder
   * ("Time", "Date", "Venue"), with one line saying the couple adds them
   * after payment. Without it, guests read "to be shared soon".
   */
  placeholder?: boolean;
  className?: string;
}

const TONE: Record<FestivityKind, string> = {
  tilak: 'jewel-fn-tilak',
  haldi: 'jewel-fn-haldi',
  mehndi: 'jewel-fn-mehndi',
  sangeet: 'jewel-fn-sangeet',
  wedding: 'jewel-fn-wedding',
  reception: 'jewel-fn-reception',
};

/** The white line drawing in each medallion. */
function KindIcon({ kind }: { kind: FestivityKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6.5"
    >
      {kind === 'tilak' && (
        // A diya: the bowl and its flame.
        <>
          <path d="M4 13h16c-.6 3.4-3.9 5.5-8 5.5S4.6 16.4 4 13Z" />
          <path d="M9 20.5h6" />
          <path d="M12 4.5c1.6 1.8 2 3.2 2 4.2a2 2 0 0 1-4 0c0-1 .4-2.4 2-4.2Z" />
        </>
      )}
      {kind === 'haldi' && (
        // A marigold: eight petals round a centre.
        <>
          <circle cx="12" cy="12" r="2.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx="12"
              cy="6.4"
              rx="1.9"
              ry="3"
              transform={`rotate(${angle} 12 12)`}
            />
          ))}
        </>
      )}
      {kind === 'mehndi' && (
        // An open hand with a henna motif in the palm.
        <>
          <path d="M8 12.5V6.2a1.3 1.3 0 0 1 2.6 0V11" />
          <path d="M10.6 10.6V4.8a1.3 1.3 0 0 1 2.6 0v5.8" />
          <path d="M13.2 10.6V5.6a1.3 1.3 0 0 1 2.6 0v6" />
          <path d="M15.8 11.2V8.4a1.3 1.3 0 0 1 2.6 0v5.4a6.6 6.6 0 0 1-6.6 6.6h-.5a5.8 5.8 0 0 1-4.6-2.3L4.6 14.9a1.3 1.3 0 0 1 2-1.7L8 14.6" />
          <circle cx="12.6" cy="15" r="1.4" />
        </>
      )}
      {kind === 'sangeet' && (
        // Two joined notes.
        <>
          <path d="M9 17.5V6.5l10-2v11" />
          <circle cx="6.8" cy="17.5" r="2.2" />
          <circle cx="16.8" cy="15.5" r="2.2" />
          <path d="M9 9.5l10-2" />
        </>
      )}
      {kind === 'wedding' && (
        // A mandap: the peaked canopy on four posts.
        <>
          <path d="M3.5 9.5 12 3.5l8.5 6" />
          <path d="M5 9.5h14" />
          <path d="M6.5 9.5v10.5M17.5 9.5v10.5M10 9.5v10.5M14 9.5v10.5" />
          <path d="M4 20h16" />
          <path d="M12 3.5V2" />
        </>
      )}
      {kind === 'reception' && (
        // Two rings, linked.
        <>
          <circle cx="9" cy="14.5" r="5" />
          <circle cx="15" cy="14.5" r="5" />
          <path d="M10.5 4.5 12 3l1.5 1.5L12 7Z" />
        </>
      )}
    </svg>
  );
}

/** The lotus drawn faint in each card's corner. Decoration. */
function Lotus() {
  return (
    <svg
      viewBox="0 0 60 60"
      aria-hidden="true"
      className="jewel-fn-lotus"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d="M30 12c6 7 7 16 0 30-7-14-6-23 0-30Z" />
      <path d="M30 42c-3-11-9-18-18-20 1 10 7 18 18 20Z" />
      <path d="M30 42c3-11 9-18 18-20-1 10-7 18-18 20Z" />
      <path d="M30 42C22 37 12 36 5 40c7 4 17 5 25 2Z" />
      <path d="M30 42c8-5 18-6 25-2-7 4-17 5-25 2Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-3.5"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </svg>
  );
}

function NavigateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="size-3">
      <path d="M12 2.5 20 21l-8-4.5L4 21Z" />
    </svg>
  );
}

/** The gold ornament over the heading: lines, two dots and a drop. */
function Ornament() {
  return (
    <svg
      viewBox="0 0 160 20"
      aria-hidden="true"
      className="mx-auto w-40"
      fill="none"
      stroke="var(--color-jewel-haldi)"
      strokeWidth="1.3"
    >
      <path d="M2 10h50M108 10h50" />
      <circle cx="64" cy="10" r="3.4" />
      <circle cx="96" cy="10" r="3.4" />
      <path d="M80 2c3 3.4 4.4 5.6 4.4 7.6a4.4 4.4 0 0 1-8.8 0c0-2 1.4-4.2 4.4-7.6Z" />
      <path d="M80 15.5v3" />
    </svg>
  );
}

function FestivityCard({ card, placeholder }: { card: Festivity; placeholder: boolean }) {
  const label = FESTIVITY_LABELS[card.kind];
  const mapsUrl = card.mapsUrl !== null && isGoogleMapsUrl(card.mapsUrl) ? card.mapsUrl : null;

  return (
    <li className={cn('jewel-fn-row', TONE[card.kind])}>
      <span className="jewel-fn-medal">
        <KindIcon kind={card.kind} />
      </span>
      <article className="jewel-fn-card">
        <Lotus />
        <p className="jewel-fn-tag">{label.tagline}</p>
        <h3 className="jewel-fn-name">{label.name}</h3>
        <div className="jewel-fn-when">
          {card.time !== null ? (
            <span className="jewel-fn-time">
              <ClockIcon />
              {formatWeddingTime(card.time)}
            </span>
          ) : (
            placeholder && (
              <span className="jewel-fn-time jewel-fn-faint">
                <ClockIcon />
                Time
              </span>
            )
          )}
          <span
            className={cn('jewel-fn-date', card.date === null && placeholder && 'jewel-fn-faint')}
          >
            {card.date !== null
              ? formatFestivityDate(card.date)
              : placeholder
                ? 'Date'
                : 'Date to be shared soon'}
          </span>
        </div>
        <div className="jewel-fn-where">
          <p
            className={cn('jewel-fn-venue', card.venue === null && placeholder && 'jewel-fn-faint')}
          >
            <PinIcon />
            <span className="break-words">
              {card.venue ?? (placeholder ? 'Venue' : 'Venue to be shared soon')}
            </span>
          </p>
          {mapsUrl !== null && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="jewel-fn-dir"
              aria-label={`Directions to the ${label.name.toLowerCase()}`}
            >
              <span className="jewel-fn-dir-pill">
                <NavigateIcon />
                Directions
              </span>
            </a>
          )}
        </div>
      </article>
    </li>
  );
}

export function WeddingFestivities({
  cards,
  placeholder = false,
  className,
}: WeddingFestivitiesProps) {
  if (cards.length === 0) return null;
  const anyMissing = cards.some(
    (card) => card.date === null || card.time === null || card.venue === null,
  );

  return (
    <section
      aria-label="Wedding festivities"
      className={cn('jewel-section jewel-bg-festivities', className)}
    >
      <span aria-hidden="true" className="jewel-jaali" />
      <div className="relative">
        <Ornament />
        <p className="jewel-label text-jewel-haldi mt-5">The celebrations</p>
        <h2 className="jewel-fn-title mt-2">Wedding Festivities</h2>
        <p className="jewel-fn-lede">
          Every ritual, every song, every celebration — we would love you beside us.
        </p>
        <ol className="jewel-fn-list">
          {cards.map((card) => (
            <FestivityCard key={card.kind} card={card} placeholder={placeholder} />
          ))}
        </ol>
        {placeholder && anyMissing && (
          <p className="jewel-fn-note">You can add the dates and venues after payment.</p>
        )}
      </div>
    </section>
  );
}

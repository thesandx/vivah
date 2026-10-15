import { Countdown } from '@/components/invite/Countdown';
import { FallingPetals } from '@/components/invite/FallingPetals';
import { ScratchCard } from '@/components/invite/ScratchCard';
import { ContactLink } from '@/components/ui/ContactLink';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { displayPhone, isGoogleMapsUrl, rsvpWhatsAppUrl } from '@/lib/invite-contact';
import { cn } from '@/lib/utils';
import {
  addToCalendarUrl,
  formatWeddingDate,
  formatWeddingTime,
  weddingDateParts,
  weddingStartsAt,
} from '@/lib/wedding-date';

/**
 * The couple's invite page, in the pink-pastel invite theme. It reads like a
 * printed card that comes alive: the names on a card framed in gold, a
 * scratch-to-reveal date, the day with a countdown, the venue with a map, a
 * WhatsApp RSVP and a closing line.
 *
 * A Server Component. Only the scratch cards and the countdown run in the
 * browser. Colours come from the `shubh-vivah` theme tokens, which
 * `InviteTheme` applies. Nothing here depends on a religion: no deity motif,
 * as the PRD asks. The lotus is a flower.
 *
 * The couple's preview renders this same component with the couple's own
 * details, so the preview is exactly what guests will see.
 *
 * Every detail the couple has not added yet says so ("shared soon") rather
 * than hiding, so guests know more is coming.
 */

export interface ShubhVivahInviteProps {
  bride: string;
  groom: string;
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  /** `YYYY-MM-DD`, or `null` until the couple adds it. */
  weddingDate: string | null;
  /** `HH:MM`, 24-hour, India Standard Time. */
  ceremonyTime: string | null;
  venueName: string | null;
  /** `New Delhi, Delhi`. */
  venueCity: string | null;
  /** A Google Maps share link. Anything else is ignored. */
  venueMapsUrl: string | null;
  /** The couple's WhatsApp number for RSVPs and calls. `null` hides both. */
  rsvpPhoneE164: string | null;
  /**
   * The product's home page, for the "Made with ❤️ by vivah.online" credit
   * at the foot of every invite. Each guest who taps it is a possible couple.
   */
  madeByUrl: string;
  /**
   * Keep the RSVP button in reach while a guest scrolls on a phone (PRD).
   * The preview turns it off: its own banner holds the bottom of the screen.
   */
  stickyRsvp?: boolean;
  className?: string;
}

/** A map pin, for the venue button. */
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

/** A calendar, for "Add to calendar". */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3.5 10h17M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A lotus in gold line and blush, over the couple's names. */
function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true" className={cn('h-14 w-28', className)}>
      <g className="stroke-butter fill-brand-soft" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M60 58 C 30 58, 10 44, 6 30 C 24 30, 44 40, 60 58 Z" />
        <path d="M60 58 C 90 58, 110 44, 114 30 C 96 30, 76 40, 60 58 Z" />
        <path d="M60 58 C 40 46, 30 28, 34 12 C 48 20, 58 38, 60 58 Z" />
        <path d="M60 58 C 80 46, 90 28, 86 12 C 72 20, 62 38, 60 58 Z" />
        <path d="M60 58 C 50 40, 50 18, 60 4 C 70 18, 70 40, 60 58 Z" className="fill-peach" />
      </g>
      <circle cx="60" cy="58" r="2.5" className="fill-butter" />
    </svg>
  );
}

/** A gold rule with a small diamond: the divider between sections. */
function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-3">
      <span className="bg-butter h-0.5 w-16 rounded-pill" />
      <span className="bg-butter size-2 rotate-45" />
      <span className="bg-butter h-0.5 w-16 rounded-pill" />
    </div>
  );
}

/** Small capitals with wide spacing, as on a printed card. */
const SPACED = 'font-display uppercase tracking-widest';

/** A section's eyebrow and title: "Where / The Venue". */
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className={cn(SPACED, 'text-small text-gold')}>{eyebrow}</p>
      <h2 className="font-display text-hero text-brand font-semibold">{title}</h2>
    </div>
  );
}

/** The card every section sits on: white, a blush outline, Phera's hard puff. */
const CARD =
  'bg-surface border-line rounded-sheet shadow-hard flex w-full flex-col items-center border-2 px-5 py-10 sm:px-10';

/** A rounded rose button, full width on a phone. */
const BUTTON =
  'squish bg-brand text-on-brand shadow-brand inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-pill px-6 font-display text-heading font-semibold tracking-widest uppercase';

export function ShubhVivahInvite({
  bride,
  groom,
  guestName,
  weddingDate,
  ceremonyTime,
  venueName,
  venueCity,
  venueMapsUrl,
  rsvpPhoneE164,
  madeByUrl,
  stickyRsvp = true,
  className,
}: ShubhVivahInviteProps) {
  const mapsUrl = venueMapsUrl !== null && isGoogleMapsUrl(venueMapsUrl) ? venueMapsUrl : null;
  const parts = weddingDate === null ? null : weddingDateParts(weddingDate);
  const time = ceremonyTime === null ? null : formatWeddingTime(ceremonyTime);
  const location = [venueName, venueCity].filter((part) => part !== null).join(', ');
  const calendarUrl =
    weddingDate === null
      ? null
      : addToCalendarUrl({
          title: `${bride} & ${groom}'s wedding`,
          isoDate: weddingDate,
          time: ceremonyTime,
          location: location === '' ? null : location,
          details: `Join us as ${bride} and ${groom} begin their forever.`,
        });

  return (
    <article
      className={cn(
        'relative isolate flex flex-col items-center overflow-hidden pb-16 text-center',
        className,
      )}
    >
      <FallingPetals className="-z-10" />

      <div className="flex w-full max-w-xl flex-col items-center gap-16 px-4 pt-16 sm:px-8">
        {/* The names, on a card framed by gold corners. */}
        <header className="relative w-full p-3">
          <span
            aria-hidden="true"
            className="border-butter absolute top-0 left-0 size-14 border-t-2 border-l-2"
          />
          <span
            aria-hidden="true"
            className="border-butter absolute top-0 right-0 size-14 border-t-2 border-r-2"
          />
          <span
            aria-hidden="true"
            className="border-butter absolute bottom-0 left-0 size-14 border-b-2 border-l-2"
          />
          <span
            aria-hidden="true"
            className="border-butter absolute right-0 bottom-0 size-14 border-r-2 border-b-2"
          />
          <div className={cn(CARD, 'gap-5')}>
            <Lotus />
            <p className="font-display text-heading text-gold" lang="hi">
              ॥ शुभ विवाह ॥
            </p>
            {guestName !== null && (
              <p className="font-script text-title text-brand">Dear {guestName},</p>
            )}
            <p className="font-display text-heading text-ink-soft max-w-sm italic">
              With the blessings of our families, we joyfully invite you to celebrate the union of
            </p>
            <h1 className="flex flex-col items-center gap-1">
              <span className="font-script text-hero text-brand">{bride}</span>
              <span className="flex items-center gap-3" aria-hidden="false">
                <span aria-hidden="true" className="bg-butter h-0.5 w-12 rounded-pill" />
                <span className="font-script text-title text-gold">&amp;</span>
                <span aria-hidden="true" className="bg-butter h-0.5 w-12 rounded-pill" />
              </span>
              <span className="font-script text-hero text-brand">{groom}</span>
            </h1>
            {/* With a date, the day waits under the scratch cards below. */}
            {weddingDate === null && (
              <p className={cn(SPACED, 'text-small text-ink')}>Date to be shared soon</p>
            )}
          </div>
        </header>

        <p
          aria-hidden="true"
          className={cn(SPACED, 'text-small text-ink-soft -mt-10 flex flex-col items-center gap-1')}
        >
          Scroll to see the magic
          <span className="animate-nudge block">
            <svg viewBox="0 0 24 24" className="size-5" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </p>

        {/* Save the date: scratch to reveal. */}
        {parts !== null && (
          <section aria-label="Save the date" className="flex w-full flex-col items-center gap-6">
            <SectionTitle eyebrow="Mark your calendar" title="Save the Date" />
            <p className="font-display text-heading text-ink-soft italic">
              Scratch below to reveal our wedding date
            </p>
            <div className="grid w-full max-w-md grid-cols-3 gap-3 sm:gap-5">
              {(
                [
                  ['Day', parts.day],
                  ['Month', parts.month.slice(0, 3)],
                  ['Year', parts.year],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <p className={cn(SPACED, 'text-small text-gold')}>{label}</p>
                  <ScratchCard value={value} label={label} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* The day, and how long until it. */}
        <section aria-label="The wedding" className={cn(CARD, 'gap-6')}>
          <p className="font-display text-heading text-ink-soft max-w-xs italic">
            A lifetime of togetherness begins with one sacred step
          </p>
          <h2 className="font-display text-hero text-brand font-semibold">The Wedding</h2>
          {parts === null ? (
            <p className={cn(SPACED, 'text-heading text-ink')}>Date to be shared soon</p>
          ) : (
            <p className={cn(SPACED, 'text-heading text-ink flex flex-col gap-1 lining-nums')}>
              <span aria-hidden="true">
                {parts.day} · {parts.monthNumber} · {parts.year}
              </span>
              <span className="sr-only">{formatWeddingDate(weddingDate ?? '')}</span>
              {time !== null && <span className="text-small text-ink-soft">{time} onwards</span>}
            </p>
          )}
          {weddingDate !== null && (
            <>
              <p className="font-script text-title text-brand">Our forever starts in…</p>
              <Countdown target={weddingStartsAt(weddingDate, ceremonyTime)} />
            </>
          )}
          {calendarUrl !== null && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="squish border-line bg-surface text-brand shadow-hard-sm rounded-pill inline-flex min-h-12 items-center gap-2 border-2 px-5 font-semibold"
            >
              <CalendarIcon />
              Add to calendar
            </a>
          )}
        </section>

        {/* Where. */}
        <section aria-label="The venue" className="flex w-full flex-col items-center gap-6">
          <SectionTitle eyebrow="Where" title="The Venue" />
          <div className={cn(CARD, 'gap-4')}>
            <span className="bg-brand-soft text-brand rounded-pill inline-grid size-12 place-items-center">
              <PinIcon />
            </span>
            {venueName === null ? (
              <>
                <p className="font-display text-title text-ink-soft italic">
                  Venue to be shared soon
                </p>
                <p className="font-display text-heading text-ink-soft">
                  We will add the place and a map here, so you can find your way.
                </p>
              </>
            ) : (
              <p className="font-display text-title text-ink font-semibold">{venueName}</p>
            )}
            {venueCity !== null && (
              <p className="font-display text-heading text-ink-soft italic">{venueCity}</p>
            )}
            {mapsUrl !== null && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(BUTTON, 'mt-4')}
              >
                <PinIcon />
                View on maps
              </a>
            )}
          </div>
        </section>

        {rsvpPhoneE164 !== null && (
          <section aria-label="RSVP" className="flex w-full flex-col items-center gap-6">
            <SectionTitle eyebrow="Kindly reply" title="Will you join us?" />
            <p className="font-display text-heading text-ink-soft max-w-sm italic">
              We would love to have you with us. Please confirm your presence, so we can arrange a
              comfortable stay for you.
            </p>
            {/* Sticky on a phone, so the RSVP stays in reach while the guest
                scrolls (PRD). In place from md up. */}
            <a
              href={rsvpWhatsAppUrl(rsvpPhoneE164, bride, groom, guestName)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(BUTTON, stickyRsvp && 'sticky bottom-4 z-10 md:static')}
            >
              <WhatsAppIcon />
              RSVP now
            </a>
            <p className="text-ink-soft font-display text-heading">
              Just a call away for any questions:{' '}
              <ContactLink
                kind="phone"
                value={displayPhone(rsvpPhoneE164)}
                className="text-brand decoration-butter"
              />
            </p>
          </section>
        )}

        <footer className="flex flex-col items-center gap-4">
          <Divider />
          <p className="font-script text-hero text-brand">Join us in our happiness!</p>
          <p className="font-display text-heading text-ink-soft max-w-sm italic">
            Your presence will mean the world to us as we begin this new chapter together.
          </p>
          <p className={cn(SPACED, 'text-small text-gold mt-2')}>With love</p>
          <p className="font-script text-title text-brand">
            {bride} &amp; {groom}
          </p>
        </footer>

        {/* Small and quiet on purpose (PRD): the couple's invite is the hero,
            and a credit they would pay to remove helps nobody. */}
        <a
          href={madeByUrl}
          target="_blank"
          rel="noopener"
          className="text-small text-ink-soft hover:text-brand inline-flex min-h-11 items-center"
        >
          Made with{' '}
          <span role="img" aria-label="love" className="mx-1">
            ❤️
          </span>{' '}
          by{' '}
          <span className="text-brand decoration-butter ml-1 font-semibold underline decoration-2 underline-offset-4">
            vivah.online
          </span>
        </a>
      </div>
    </article>
  );
}

import Image from 'next/image';

import { Countdown } from '@/components/invite/Countdown';
import { FallingPetals } from '@/components/invite/FallingPetals';
import { Ganesha } from '@/components/invite/Ganesha';
import { ScratchCard } from '@/components/invite/ScratchCard';
import { ContactLink } from '@/components/ui/ContactLink';
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
 * printed card that comes alive: Shri Ganesh and his shloka over the names,
 * as on an offline Hindu wedding card, a scratch-to-reveal date, the day with
 * a countdown, the venue with a Google Maps button, a WhatsApp RSVP and a
 * closing line.
 *
 * A Server Component. Only the scratch cards and the countdown run in the
 * browser. Colours come from the `shubh-vivah` theme tokens, which
 * `InviteTheme` applies.
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
   * The couple's way to their dashboard, under the credit: "Edit details".
   * Only the live site passes it; the preview has its own banner.
   */
  editDetailsUrl?: string;
  /**
   * Keep the RSVP button in reach while a guest scrolls on a phone (PRD).
   * The preview turns it off: its own banner holds the bottom of the screen.
   */
  stickyRsvp?: boolean;
  /**
   * What the venue card says while there is no venue. The couple's preview
   * tells them they can add it from their dashboard; guests get the default.
   */
  venuePendingNote?: string;
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

/**
 * The Ganesh shloka every offline card opens with: "O Lord Ganesha, of the
 * curved trunk and mighty body, as bright as a million suns, remove every
 * obstacle from all my work, always."
 */
const SHLOKA = [
  '॥ श्री गणेशाय नमः ॥',
  'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।',
  'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
] as const;

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
      <h2 className="font-script text-hero text-brand">{title}</h2>
    </div>
  );
}

/** The card every section sits on: white, a blush outline, Phera's hard puff. */
const CARD =
  'bg-surface border-line rounded-sheet shadow-hard flex w-full flex-col items-center border-2 px-5 py-10 sm:px-10';

/**
 * A rounded pill button, full width on a phone, as on the couple's own
 * hand-made invites: the colour comes from the call site.
 */
const BUTTON =
  'squish shadow-hard inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 rounded-pill px-6 font-display text-heading font-bold tracking-widest uppercase';

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
  editDetailsUrl,
  stickyRsvp = true,
  venuePendingNote = 'We will add the place and a map here, so you can find your way.',
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
            <Ganesha />
            <p lang="sa" className="font-shloka text-heading text-brand flex flex-col italic">
              {SHLOKA.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
            {guestName !== null && (
              <p className="font-script text-title text-brand">Dear {guestName},</p>
            )}
            <p className="font-display text-heading text-ink-soft max-w-sm italic">
              With hearts full of joy, we
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
            <p className="font-display text-heading text-ink-soft italic">
              invite you to our wedding
            </p>
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
          Scroll down for the details
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
          <h2 className="font-script text-hero text-brand">The Wedding</h2>
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
            <Countdown target={weddingStartsAt(weddingDate, ceremonyTime)} />
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
                <p className="font-display text-heading text-ink-soft max-w-sm">
                  {venuePendingNote}
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
                className={cn(BUTTON, 'bg-surface text-maps border-line mt-4 border-2')}
              >
                <Image src="/icons/google-maps.png" alt="" width={24} height={24} />
                Wedding venue
              </a>
            )}
          </div>
        </section>

        {rsvpPhoneE164 !== null && (
          <section aria-label="RSVP" className="flex w-full flex-col items-center gap-6">
            <SectionTitle eyebrow="Kindly reply" title="Will you join us?" />
            <p className="font-display text-heading text-ink-soft max-w-sm italic">
              We would love to have you with us. Please confirm your presence.
            </p>
            {/* Sticky on a phone, so the RSVP stays in reach while the guest
                scrolls (PRD). In place from md up. */}
            <a
              href={rsvpWhatsAppUrl(rsvpPhoneE164, bride, groom, guestName)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                BUTTON,
                'bg-whatsapp text-surface',
                stickyRsvp && 'sticky bottom-4 z-10 md:static',
              )}
            >
              <Image src="/icons/whatsapp.png" alt="" width={24} height={24} />
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
        {editDetailsUrl !== undefined && (
          <a
            href={editDetailsUrl}
            rel="nofollow"
            className="text-small text-ink-soft hover:text-brand -mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Your wedding? Edit details
          </a>
        )}
      </div>
    </article>
  );
}

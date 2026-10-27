import Image from 'next/image';

import { Countdown } from '@/components/invite/Countdown';
import { OurFamilies } from '@/components/invite/OurFamilies';
import { PetalShower } from '@/components/invite/PetalShower';
import { SaveTheDateCards } from '@/components/invite/SaveTheDateCards';
import { WeddingFestivities } from '@/components/invite/WeddingFestivities';
import { type NameOrder, orderedNames } from '@/lib/couple-names';
import { displayPhone, isGoogleMapsUrl, rsvpWhatsAppUrl } from '@/lib/invite-contact';
import { cn } from '@/lib/utils';
import {
  addToCalendarUrl,
  formatWeddingDate,
  formatWeddingTime,
  weddingDateParts,
  weddingStartsAt,
} from '@/lib/wedding-date';
import { type WeddingFamilies } from '@/lib/wedding-families';
import { festivityCards, type WeddingFunction } from '@/lib/wedding-functions';

/**
 * The couple's invite page, built to the product owner's jewel design spec:
 * a 430px column of jewel-toned blocks on ivory. Shri Ganesh in a mehrab arch
 * over the names, a scratch-to-reveal date, the day in a peacock block with
 * a countdown, the venue card, the couple's families when they added them,
 * the festivities timeline when the couple has more functions, a vermilion RSVP block and a rani-pink close.
 * Marigold garlands hang between the blocks, and marigold and rose petals
 * drift down over it all (`PetalShower`, CSS only).
 *
 * A Server Component. Only the scratch cards (with the confetti burst when
 * the date is out) and the countdown run in the browser. The colours, faces and sizes are the `jewel-*` tokens and
 * utilities in `styles/globals.css`, the spec's own values.
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
  /** Whose name comes first. Default: the bride's. */
  nameOrder?: NameOrder | undefined;
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
   * The RSVP button's WhatsApp message, instead of "I will be attending".
   * The sample invite uses it, so a visitor's tap asks us for a site.
   */
  rsvpMessage?: string;
  /**
   * The product's home page, for the "Made with ♥ by vivah.online" credit
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
   * The unpaid preview shows the venue card filled with faint placeholders
   * ("Your venue name", "Venue address", "City") and one line saying the
   * couple adds them after payment. The live site leaves it off: guests see
   * "Venue to be shared soon".
   */
  venuePlaceholder?: boolean;
  /**
   * The functions besides the wedding (tilak, haldi, mehndi, sangeet,
   * reception). With at least one, a "Wedding Festivities" timeline shows
   * after the venue, with the wedding among them, sorted by date. With none,
   * the section is left out. The preview's placeholders follow
   * `venuePlaceholder`.
   */
  functions?: readonly WeddingFunction[];
  /**
   * The grandparents' and parents' names on each side. With a name on
   * either side, an "Our Families" section shows after the venue, before
   * the festivities. The preview's placeholders follow `venuePlaceholder`.
   */
  families?: WeddingFamilies | undefined;
  className?: string;
}

/**
 * The Ganesh shloka every offline card opens with: "O Lord Ganesha, of the
 * curved trunk and mighty body, as bright as a million suns, remove every
 * obstacle from all my work, always."
 */
const SHLOKA = [
  '॥ श्री गणेशाय नमः ॥',
  'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।',
  'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
] as const;

const TOGETHERNESS = 'A lifetime of togetherness begins with one sacred step';

/** The stroked icons on the buttons. */
function Icon({ name, className }: { name: 'calendar' | 'pin' | 'check'; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {name === 'calendar' && (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      )}
      {name === 'pin' && (
        <>
          <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
          <circle cx="12" cy="9.8" r="2.4" />
        </>
      )}
      {name === 'check' && <path d="M5 12.5l4.5 4.5L19 7.5" />}
    </svg>
  );
}

/** The pierced-screen lattice over a block. Decoration. */
function Jaali() {
  return <span aria-hidden="true" className="jewel-jaali" />;
}

/**
 * The marigold garland that hangs between two blocks: a green vine with
 * marigolds and rosebuds. A sibling of the blocks, so no block clips it.
 */
function Garland() {
  const marigolds = [
    [60, 18],
    [120, 10],
    [180, 7],
    [240, 7],
    [300, 10],
    [360, 18],
  ] as const;
  const rosebuds = [
    [90, 13],
    [150, 7.5],
    [210, 5.5],
    [270, 7.5],
    [330, 13],
  ] as const;
  return (
    <svg
      viewBox="0 0 430 44"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="bg-jewel-ivory block h-11 w-full"
    >
      <path
        d="M20 24 Q215 -2 410 24"
        stroke="var(--color-jewel-emerald)"
        strokeWidth="2"
        fill="none"
      />
      {rosebuds.map(([x, y]) => (
        <circle key={x} cx={x} cy={y + 4} r="5.3" fill="var(--color-jewel-rani)" />
      ))}
      {marigolds.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y + 4} r="7.5" fill="var(--color-jewel-marigold)" />
          <circle cx={x} cy={y + 4} r="3.2" fill="var(--color-jewel-haldi)" />
        </g>
      ))}
    </svg>
  );
}

/** A section's micro-label and title: "Where / The Venue". */
function SectionTitle({
  label,
  title,
  labelClassName,
  titleClassName,
}: {
  label: string;
  title: React.ReactNode;
  labelClassName: string;
  titleClassName: string;
}) {
  return (
    <>
      <p className={cn('jewel-label', labelClassName)}>{label}</p>
      <h2 className={cn('jewel-title', titleClassName)}>{title}</h2>
    </>
  );
}

export function ShubhVivahInvite({
  bride,
  groom,
  nameOrder,
  guestName,
  weddingDate,
  ceremonyTime,
  venueName,
  venueCity,
  venueMapsUrl,
  rsvpPhoneE164,
  rsvpMessage,
  madeByUrl,
  editDetailsUrl,
  stickyRsvp = true,
  venuePlaceholder = false,
  functions = [],
  families,
  className,
}: ShubhVivahInviteProps) {
  const [first, second] = orderedNames({ bride, groom, nameOrder });
  const mapsUrl = venueMapsUrl !== null && isGoogleMapsUrl(venueMapsUrl) ? venueMapsUrl : null;
  const parts = weddingDate === null ? null : weddingDateParts(weddingDate);
  const time = ceremonyTime === null ? null : formatWeddingTime(ceremonyTime);
  const location = [venueName, venueCity].filter((part) => part !== null).join(', ');
  const festivities = festivityCards(functions, {
    date: weddingDate,
    time: ceremonyTime,
    // One line on the card, as in the design: the venue's name, or the town.
    venue: venueName ?? venueCity,
    mapsUrl,
  });
  const calendarUrl =
    weddingDate === null
      ? null
      : addToCalendarUrl({
          title: `${first} & ${second}'s wedding`,
          isoDate: weddingDate,
          time: ceremonyTime,
          location: location === '' ? null : location,
          details: `Join us as ${first} and ${second} begin their forever.`,
        });

  return (
    <div className={cn('bg-jewel-maroon-deep flex flex-col', className)}>
      <article className="jewel-page flex-1">
        <PetalShower />
        {/* Shri Ganesh in the mehrab arch, over the couple's names. */}
        <header className="jewel-section jewel-bg-hero">
          <Jaali />
          <div className="relative">
            <div className="jewel-arch">
              <Image
                src="/invite/ganesha.png"
                alt=""
                width={480}
                height={480}
                priority
                className="mx-auto mb-3.5 block h-auto w-33"
              />
              <p lang="sa" className="jewel-om" aria-hidden="true">
                ॥ ॐ ॥
              </p>
              <p lang="sa" className="jewel-shloka flex flex-col">
                {SHLOKA.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            </div>

            {guestName !== null && <p className="jewel-dear">Dear {guestName},</p>}
            <p className="jewel-withhearts">With hearts full of joy, we</p>
            <h1 className="flex flex-col items-center gap-0.5">
              <span className="jewel-name jewel-foil-light">{first}</span>
              <span className="text-jewel-sindoor flex items-center gap-3.5">
                <svg viewBox="0 0 40 20" aria-hidden="true" className="w-8.5 opacity-90">
                  <path d="M2 10h12" stroke="currentColor" strokeWidth="1.3" fill="none" />
                </svg>
                <span className="jewel-amp">&amp;</span>
                <svg viewBox="0 0 40 20" aria-hidden="true" className="w-8.5 opacity-90">
                  <path d="M26 10h12" stroke="currentColor" strokeWidth="1.3" fill="none" />
                </svg>
              </span>
              <span className="jewel-name jewel-foil-light">{second}</span>
            </h1>
            <p className="jewel-invite-line">invite you to our wedding</p>
            {/* With a date, the day waits under the scratch cards below. */}
            {parts === null && (
              <p className="jewel-label text-jewel-gold mt-4">Date to be shared soon</p>
            )}
            <p aria-hidden="true" className="jewel-scroll-cue flex flex-col items-center gap-1.75">
              Scroll down for the details
              <svg viewBox="0 0 20 12" className="jewel-chevron h-2.5 w-4.5" fill="none">
                <path
                  d="M1.5 1.5l8.5 8.5 8.5-8.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </p>
          </div>
        </header>
        <Garland />

        {/* Save the date: scratch to reveal. */}
        {parts !== null && (
          <section aria-label="Save the date" className="jewel-section jewel-bg-save">
            <Jaali />
            <div className="relative">
              <SectionTitle
                label="Mark your calendar"
                title="Save the Date"
                labelClassName="text-jewel-gold"
                titleClassName="text-jewel-sindoor"
              />
              <p className="jewel-note mt-6.5">Scratch below to reveal our wedding date</p>
              <SaveTheDateCards
                day={parts.day}
                month={parts.monthNumber}
                year={parts.year.slice(2)}
              />
              <p className="jewel-note mt-8 max-w-50">{TOGETHERNESS}</p>
            </div>
          </section>
        )}

        {/* The day, and how long until it. */}
        <section aria-label="The wedding" className="jewel-section jewel-bg-wedding">
          <Jaali />
          <div className="relative flex flex-col items-center">
            <p className="jewel-lede text-jewel-light/80 max-w-55">{TOGETHERNESS}</p>
            <h2 className="jewel-title mt-2 text-jewel-light">The Wedding</h2>
            {parts === null ? (
              <p className="jewel-time mt-4">Date to be shared soon</p>
            ) : (
              <>
                <p className="jewel-date mt-4.5 lining-nums">
                  <span aria-hidden="true">
                    {parts.day} · {parts.monthNumber} · {parts.year}
                  </span>
                  <span className="sr-only">{formatWeddingDate(weddingDate ?? '')}</span>
                </p>
                {time !== null && <p className="jewel-time">{time} onwards</p>}
              </>
            )}
            {weddingDate !== null && (
              <Countdown target={weddingStartsAt(weddingDate, ceremonyTime)} />
            )}
            {calendarUrl !== null && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="jewel-btn jewel-btn-cal"
              >
                <Icon name="calendar" className="size-3.5" />
                Add to calendar
              </a>
            )}
          </div>
        </section>
        <Garland />

        {/* Where. */}
        <section aria-label="The venue" className="jewel-section jewel-bg-venue">
          <Jaali />
          <div className="relative">
            <SectionTitle
              label="Where"
              title="The Venue"
              labelClassName="text-jewel-emerald"
              titleClassName="text-jewel-emerald"
            />
            <div className="jewel-venue-card">
              <span className="jewel-pin">
                <Icon name="pin" className="size-5" />
              </span>
              {venueName === null && venuePlaceholder ? (
                <>
                  <p className="jewel-venue-name opacity-40">Your venue name</p>
                  <p className="jewel-venue-loc opacity-60">Venue address</p>
                  <p className="jewel-venue-loc opacity-60">City</p>
                  <p className="jewel-lede text-jewel-emerald mt-4">
                    You can add these after payment.
                  </p>
                </>
              ) : venueName === null ? (
                <>
                  <p className="jewel-venue-name">Venue to be shared soon</p>
                  <p className="jewel-venue-loc">
                    We will add the place and a map here, so you can find your way.
                  </p>
                </>
              ) : (
                <p className="jewel-venue-name">{venueName}</p>
              )}
              {venueCity !== null && <p className="jewel-venue-loc">{venueCity}</p>}
              {mapsUrl !== null && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jewel-btn jewel-btn-map"
                >
                  <Icon name="pin" className="size-3.5" />
                  Wedding venue
                </a>
              )}
            </div>
          </div>
        </section>
        <Garland />

        {(venuePlaceholder || families !== undefined) && (
          <OurFamilies families={families} nameOrder={nameOrder} placeholder={venuePlaceholder} />
        )}

        {festivities.length > 0 && (
          <>
            <WeddingFestivities cards={festivities} placeholder={venuePlaceholder} />
            <Garland />
          </>
        )}

        {rsvpPhoneE164 !== null && (
          <section aria-label="RSVP" className="jewel-section jewel-bg-rsvp">
            <Jaali />
            <div className="relative flex flex-col items-center">
              <SectionTitle
                label="Kindly reply"
                title="Will you join us?"
                labelClassName="text-jewel-haldi"
                titleClassName="text-jewel-light"
              />
              <p className="jewel-lede text-jewel-light/85 mt-3 max-w-70">
                We would love to have you with us. Please confirm your presence.
              </p>
              {/* Sticky on a phone, so the RSVP stays in reach while the guest
                  scrolls (PRD). In place from md up. */}
              <a
                href={rsvpWhatsAppUrl(rsvpPhoneE164, first, second, guestName, rsvpMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'jewel-btn jewel-btn-rsvp',
                  stickyRsvp && 'sticky bottom-4 z-10 md:static',
                )}
              >
                <Icon name="check" className="size-4" />
                RSVP now
              </a>
              <p className="jewel-call">
                Just a call away for any questions:{' '}
                <a
                  href={`tel:${rsvpPhoneE164}`}
                  className="text-jewel-haldi tracking-wide whitespace-nowrap"
                >
                  {displayPhone(rsvpPhoneE164)}
                </a>
              </p>
            </div>
          </section>
        )}

        <footer className="jewel-section jewel-bg-closing">
          <Jaali />
          <div className="relative flex flex-col items-center">
            <svg
              viewBox="0 0 120 22"
              aria-hidden="true"
              className="w-30"
              fill="none"
              stroke="var(--color-jewel-haldi)"
              strokeWidth="1.1"
            >
              <path d="M4 11h34" />
              <path d="M82 11h34" />
              <path
                d="M60 4l3.6 4.4L60 18l-3.6-9.6z"
                fill="var(--color-jewel-haldi)"
                stroke="none"
              />
              <circle cx="49" cy="11" r="2.6" />
              <circle cx="71" cy="11" r="2.6" />
            </svg>
            <h2 className="jewel-title mt-4 text-jewel-light">
              Join us in our
              <br />
              happiness!
            </h2>
            <p className="jewel-msg">
              Your presence will mean the world to us as we begin this new chapter together.
            </p>
            <p className="jewel-withlove">With love</p>
            <p className="jewel-sign jewel-foil-dark">
              {first} &amp; {second}
            </p>
            <svg viewBox="0 0 120 14" aria-hidden="true" className="jewel-closing-rule" fill="none">
              <path d="M2 8h46" stroke="var(--color-jewel-gold-line)" strokeWidth="1" />
              <path d="M72 8h46" stroke="var(--color-jewel-gold-line)" strokeWidth="1" />
              <path
                d="M60 2c1.6 2.6 4.6 4.4 4.6 7.2A4.6 4.6 0 0 1 60 12h0a4.6 4.6 0 0 1-4.6-2.8C55.4 6.4 58.4 4.6 60 2z"
                fill="var(--color-jewel-marigold)"
              />
            </svg>
            {/* The one place the invite speaks for us: each guest who taps it
                is a possible couple. A quiet pill, not a banner, so the
                couple's names stay the hero. */}
            <a href={madeByUrl} target="_blank" rel="noopener" className="jewel-credit">
              <span className="jewel-credit-small">
                Made with{' '}
                <span role="img" aria-label="love" className="jewel-credit-heart">
                  ♥
                </span>{' '}
                by
              </span>{' '}
              <span className="jewel-credit-brand">vivah.online</span>
              <svg
                viewBox="0 0 8 14"
                aria-hidden="true"
                className="jewel-credit-arrow"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1.5 1.5L6.5 7l-5 5.5" />
              </svg>
            </a>
            {editDetailsUrl !== undefined && (
              <a
                href={editDetailsUrl}
                rel="nofollow"
                className="jewel-editlink inline-flex min-h-11 items-center"
              >
                Your wedding? Edit details
              </a>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}

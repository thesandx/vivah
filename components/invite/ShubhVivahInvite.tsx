import { Countdown } from '@/components/invite/Countdown';
import { FallingPetals } from '@/components/invite/FallingPetals';
import { Toran } from '@/components/invite/Toran';
import { ContactLink } from '@/components/ui/ContactLink';
import { displayPhone, isGoogleMapsUrl, rsvpWhatsAppUrl } from '@/lib/invite-contact';
import { cn } from '@/lib/utils';
import { formatWeddingDate, formatWeddingTime, weddingStartsAt } from '@/lib/wedding-date';

/**
 * The couple's invite page in the Shubh Vivah theme. It follows the couple's
 * own first site (anushka.sandeep.app): the greeting, the names, the day and
 * place, a countdown, the venue map, a WhatsApp RSVP and a phone number.
 *
 * A Server Component. Only the countdown runs in the browser. Colours come
 * from the `shubh-vivah` theme tokens, which `InviteTheme` applies. Nothing
 * here depends on a religion: no deity motif, as the PRD asks.
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
  /** `Darbhanga, Bihar`. */
  venueCity: string | null;
  /** A Google Maps share link. Anything else is ignored. */
  venueMapsUrl: string | null;
  /**
   * The couple's WhatsApp number for RSVPs and calls. `null` hides both: the
   * couple's preview has RSVP off.
   */
  rsvpPhoneE164: string | null;
  /**
   * The product's home page, for the "Made with ❤️ by vivah.online" credit
   * at the foot of every invite. Each guest who taps it is a possible couple.
   */
  madeByUrl: string;
  className?: string;
}

/** WhatsApp's speech-bubble mark, drawn in the button's text colour. */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

/** A map pin, for the venue button. */
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

/** Gold rules with marigold dots: the section divider. */
function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-2">
      <span className="bg-butter h-0.5 w-12 rounded-pill" />
      <span className="bg-peach size-2 rounded-full" />
      <span className="bg-brand-soft size-2.5 rounded-full" />
      <span className="bg-peach size-2 rounded-full" />
      <span className="bg-butter h-0.5 w-12 rounded-pill" />
    </div>
  );
}

/** Small capitals with wide spacing, as on a printed card. */
const SPACED = 'font-display uppercase tracking-widest';

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
  className,
}: ShubhVivahInviteProps) {
  const mapsUrl = venueMapsUrl !== null && isGoogleMapsUrl(venueMapsUrl) ? venueMapsUrl : null;
  const when =
    weddingDate === null
      ? null
      : [
          formatWeddingDate(weddingDate),
          ceremonyTime === null ? null : formatWeddingTime(ceremonyTime),
        ]
          .filter((part) => part !== null)
          .join(' · ');

  return (
    <article
      className={cn('relative isolate flex flex-col items-center overflow-hidden', className)}
    >
      <FallingPetals className="-z-10" />
      <Toran />

      <div className="flex w-full max-w-2xl flex-col items-center gap-10 px-5 pt-8 pb-12 text-center sm:px-8 sm:pt-12">
        <header className="flex flex-col items-center gap-5">
          {guestName !== null && (
            <p className="font-script text-title text-brand">Hi {guestName},</p>
          )}
          <p className={cn(SPACED, 'text-heading text-ink-soft')}>With hearts full of joy, we</p>
          <h1 className="flex flex-col items-center gap-2">
            <span className="font-script text-hero text-brand">{bride}</span>
            <span className="font-script text-title text-peach">&amp;</span>
            <span className="font-script text-hero text-brand">{groom}</span>
          </h1>
          <p className={cn(SPACED, 'text-heading text-ink-soft')}>invite you to our wedding</p>
          <Divider />
          <div className={cn(SPACED, 'text-ink flex flex-col items-center gap-1')}>
            <span className="text-small text-ink-soft">On</span>
            <span className="text-heading text-butter font-semibold">
              {when ?? 'Date to be shared soon'}
            </span>
            <span className="text-small text-ink-soft">At</span>
            <span className="text-heading text-butter font-semibold">
              {venueName ?? 'Venue to be shared soon'}
            </span>
            {venueCity !== null && <span className="text-body text-ink-soft">{venueCity}</span>}
          </div>
        </header>

        {weddingDate !== null && <Countdown target={weddingStartsAt(weddingDate, ceremonyTime)} />}

        {(mapsUrl !== null || rsvpPhoneE164 !== null) && (
          <section aria-label="Venue and RSVP" className="flex w-full flex-col items-center gap-5">
            {mapsUrl !== null && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-butter bg-surface text-brand shadow-mochi inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-pill border-2 px-6 font-semibold tracking-wide uppercase"
              >
                <PinIcon />
                Wedding venue
              </a>
            )}
            {rsvpPhoneE164 !== null && (
              <>
                <p className="text-ink-soft max-w-sm">
                  We would love to have you with us! Please confirm your presence so we can arrange
                  a comfortable stay for you.
                </p>
                {/* Sticky on a phone, so the RSVP stays in reach while the
                    guest scrolls (PRD). In place from md up. */}
                <a
                  href={rsvpWhatsAppUrl(rsvpPhoneE164, bride, groom, guestName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-butter bg-brand text-surface shadow-mochi sticky bottom-4 z-10 inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-pill border-2 px-6 font-semibold tracking-wide uppercase md:static"
                >
                  <WhatsAppIcon />
                  RSVP now
                </a>
              </>
            )}
          </section>
        )}

        <Divider />

        <footer className="flex flex-col items-center gap-2">
          <p className="text-ink-soft max-w-md">
            We cannot wait to celebrate this milestone of our family journey with you!
          </p>
          {rsvpPhoneE164 !== null && (
            <>
              <p className="text-ink-soft">Just a call away for any questions:</p>
              <ContactLink
                kind="phone"
                value={displayPhone(rsvpPhoneE164)}
                className="text-brand decoration-butter"
              />
            </>
          )}
          <p className="font-script text-title text-brand mt-6">Join us in our happiness!</p>
          <p className="text-ink-soft max-w-md">
            Your presence will mean the world to us as we celebrate this special day.
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

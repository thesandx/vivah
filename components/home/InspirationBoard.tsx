import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { cn } from '@/lib/utils';

/**
 * The home page's pin board: what a guest sees on a vivah.online invite,
 * drawn as pins in a masonry grid. A Server Component, drawn in CSS and SVG,
 * so it costs no image download.
 *
 * Every pin shows a feature that the invite has today. Do not add a pin for
 * a feature that is not built.
 *
 * The grid is CSS columns: two on a phone, three from `lg`. Each pin keeps
 * its natural height, which gives the staggered Pinterest look.
 */

interface PinProps {
  title: string;
  note: string;
  className?: string;
  children: React.ReactNode;
}

function Pin({ title, note, className, children }: PinProps) {
  return (
    <figure className="mb-4 break-inside-avoid sm:mb-5">
      <div
        className={cn(
          'shadow-mochi rounded-card overflow-hidden transition-transform hover:-translate-y-1',
          className,
        )}
      >
        {children}
      </div>
      <figcaption className="flex flex-col px-1 pt-2">
        <span className="text-small font-semibold">{title}</span>
        <span className="text-small text-ink-soft">{note}</span>
      </figcaption>
    </figure>
  );
}

/** A row of marigolds, like the toran on the invite. */
function Marigolds() {
  return (
    <svg viewBox="0 0 120 16" aria-hidden="true" className="h-4 w-full">
      <line x1="0" y1="4" x2="120" y2="4" className="stroke-butter" strokeWidth="1" />
      {Array.from({ length: 8 }, (_, index) => (
        <g key={index}>
          <circle cx={7.5 + index * 15} cy="8" r="6" className="fill-peach" />
          <circle cx={7.5 + index * 15} cy="8" r="3" className="fill-surface" />
          <circle cx={7.5 + index * 15} cy="8" r="1.2" className="fill-butter" />
        </g>
      ))}
    </svg>
  );
}

function InvitePin() {
  return (
    <Pin
      title="Your wedding site"
      note="Names, date, venue and a toran, on your own link"
      className="bg-brand-soft"
    >
      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-8 text-center">
        <Marigolds />
        <p className="text-small text-ink-soft mt-4 tracking-widest uppercase">Shubh Vivah</p>
        <p className="font-script text-title leading-none">Raadha</p>
        <p className="font-display text-heading">&amp;</p>
        <p className="font-script text-title leading-none">Shyam</p>
        <span aria-hidden="true" className="bg-butter mt-2 h-0.5 w-12" />
        <p className="font-display text-body font-semibold">Sunday, 14 February 2027</p>
        <p className="text-small text-ink-soft">Darbhanga, Bihar</p>
      </div>
    </Pin>
  );
}

function GuestNamePin() {
  return (
    <Pin
      title="Each guest by name"
      note="Every guest gets a link that greets them"
      className="bg-surface"
    >
      <div className="flex flex-col gap-2 p-5">
        <p className="text-small text-ink-soft">Dear</p>
        <p className="font-script text-title decoration-butter leading-tight underline decoration-2 underline-offset-8">
          Sharma ji &amp; family
        </p>
        <p className="text-small text-ink-soft">With joy, you are invited to our wedding.</p>
      </div>
    </Pin>
  );
}

function CountdownPin() {
  const tiles = [
    ['120', 'Days'],
    ['09', 'Hours'],
    ['41', 'Mins'],
  ] as const;
  return (
    <Pin title="A live countdown" note="Days to go, ticking on every invite" className="bg-grape">
      <div className="flex flex-col items-center gap-3 p-4 text-center">
        <p className="font-script text-heading">Our forever starts in</p>
        <div className="grid w-full grid-cols-3 gap-1.5">
          {tiles.map(([value, unit]) => (
            <span key={unit} className="bg-surface rounded-input flex flex-col py-2">
              <span className="font-display text-heading font-semibold">{value}</span>
              <span className="text-small text-ink-soft">{unit}</span>
            </span>
          ))}
        </div>
      </div>
    </Pin>
  );
}

function WhatsAppPin() {
  return (
    <Pin title="Opens from WhatsApp" note="No app to install, for anyone" className="bg-sunken">
      <div className="flex flex-col gap-2 p-4">
        <div className="bg-soda rounded-input flex flex-col gap-2 self-end p-2">
          <div className="bg-surface rounded-box flex flex-col p-2">
            <span className="text-small font-semibold">Raadha weds Shyam</span>
            <span className="text-small text-ink-soft break-all">raadha-shyam.vivah.online</span>
          </div>
          <span className="text-small px-1">Please come and bless us 🙏</span>
        </div>
        <div className="bg-surface rounded-input text-small self-start px-3 py-2">
          We will be there! 🎉
        </div>
      </div>
    </Pin>
  );
}

function MapPin() {
  return (
    <Pin title="Venue on the map" note="One tap opens Google Maps" className="bg-surface">
      <svg viewBox="0 0 160 110" aria-hidden="true" className="bg-soda/40 block w-full">
        <path
          d="M0 80 C 40 70, 60 95, 100 78 S 150 60, 160 66"
          className="stroke-surface fill-none"
          strokeWidth="8"
        />
        <path d="M45 0 L 60 110" className="stroke-surface fill-none" strokeWidth="6" />
        <path
          d="M110 0 C 100 40, 125 60, 118 110"
          className="stroke-surface fill-none"
          strokeWidth="5"
        />
        <path
          d="M82 22a14 14 0 0 0-14 14c0 10 14 26 14 26s14-16 14-26a14 14 0 0 0-14-14Z"
          className="fill-brand stroke-ink"
          strokeWidth="1.5"
        />
        <circle cx="82" cy="36" r="5" className="fill-surface" />
      </svg>
      <div className="flex flex-col p-4">
        <span className="text-small font-semibold">Kamal Vatika</span>
        <span className="text-small text-ink-soft">Darbhanga, Bihar</span>
      </div>
    </Pin>
  );
}

function EnvelopePin() {
  return (
    <Pin
      title="An envelope to open"
      note="Guests tap the seal, and petals fall"
      className="bg-peach"
    >
      <div className="flex flex-col items-center gap-3 p-6">
        <svg viewBox="0 0 120 84" aria-hidden="true" className="w-full">
          <rect
            x="2"
            y="2"
            width="116"
            height="80"
            rx="6"
            className="fill-surface stroke-ink"
            strokeWidth="2"
          />
          <path
            d="M2 8 L 60 50 L 118 8"
            className="fill-brand-soft stroke-ink"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="48" r="13" className="fill-danger stroke-ink" strokeWidth="2" />
          <path
            d="M60 54s-6-3.6-6-7.6a3.4 3.4 0 0 1 6-2.2 3.4 3.4 0 0 1 6 2.2c0 4-6 7.6-6 7.6Z"
            className="fill-brand-soft"
          />
        </svg>
        <span className="font-script text-heading">Tap to open</span>
      </div>
    </Pin>
  );
}

function RsvpPin() {
  return (
    <Pin title="RSVP on WhatsApp" note="Guests answer you in one tap" className="bg-butter">
      <div className="flex flex-col items-center gap-3 p-5 text-center">
        <p className="font-script text-title leading-tight">Will you join us?</p>
        <span className="bg-whatsapp text-surface rounded-pill text-small flex items-center gap-2 px-4 py-2 font-semibold">
          <WhatsAppIcon className="size-4" />
          Reply on WhatsApp
        </span>
      </div>
    </Pin>
  );
}

function LinkPin() {
  return (
    <Pin title="Your own link" note="Easy to type, easy to remember" className="bg-surface">
      <div className="flex flex-col gap-1 p-5">
        <span className="text-small text-ink-soft">Your wedding lives at</span>
        <span className="font-display text-heading font-semibold break-all">
          anika-rohan
          <span className="text-ink-soft">.vivah.online</span>
        </span>
      </div>
    </Pin>
  );
}

export interface InspirationBoardProps {
  className?: string;
}

export function InspirationBoard({ className }: InspirationBoardProps) {
  return (
    <div className={cn('columns-2 gap-4 sm:gap-5 lg:columns-3', className)}>
      <InvitePin />
      <GuestNamePin />
      <CountdownPin />
      <WhatsAppPin />
      <EnvelopePin />
      <MapPin />
      <RsvpPin />
      <LinkPin />
    </div>
  );
}

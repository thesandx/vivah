import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { cn } from '@/lib/utils';

/**
 * "What your guests see": eight tiles, one per thing a guest gets on a
 * vivah.online invite. A Server Component, drawn in CSS and SVG, so it costs
 * no image download.
 *
 * Every tile has the same shape: a small picture of equal height, a title,
 * and from `sm` a one-line note. Equal tiles in a grid read at a glance: two
 * columns and four rows on a phone, four columns and two rows from `lg`.
 *
 * Every tile shows a feature that the invite has today. Do not add a tile for
 * a feature that is not built.
 */

interface TileProps {
  title: string;
  note: string;
  /** The picture's fill. A festival tone names the feature's category. */
  className: string;
  children: React.ReactNode;
}

function Tile({ title, note, className, children }: TileProps) {
  return (
    <li className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className={cn(
          'shadow-hard rounded-card flex h-24 items-center justify-center overflow-hidden p-3 text-center sm:h-32',
          className,
        )}
      >
        {children}
      </div>
      <div className="flex flex-col px-1">
        <h3 className="text-small font-semibold">{title}</h3>
        <p className="text-small text-ink-soft hidden sm:block">{note}</p>
      </div>
    </li>
  );
}

function Envelope() {
  return (
    <svg viewBox="0 0 120 84" className="h-16 sm:h-20">
      <rect
        x="2"
        y="2"
        width="116"
        height="80"
        rx="6"
        className="fill-surface stroke-ink"
        strokeWidth="2.5"
      />
      <path
        d="M2 8 L 60 50 L 118 8"
        className="fill-brand-soft stroke-ink"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="48" r="13" className="fill-danger stroke-ink" strokeWidth="2.5" />
      <path
        d="M60 54s-6-3.6-6-7.6a3.4 3.4 0 0 1 6-2.2 3.4 3.4 0 0 1 6 2.2c0 4-6 7.6-6 7.6Z"
        className="fill-brand-soft"
      />
    </svg>
  );
}

function VenueMap() {
  return (
    <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" className="size-full">
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
        d="M82 26a16 16 0 0 0-16 16c0 11 16 30 16 30s16-19 16-30a16 16 0 0 0-16-16Z"
        className="fill-brand stroke-ink"
        strokeWidth="2"
      />
      <circle cx="82" cy="42" r="6" className="fill-surface" />
    </svg>
  );
}

export interface GuestPreviewProps {
  className?: string;
}

export function GuestPreview({ className }: GuestPreviewProps) {
  return (
    <ul className={cn('grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 lg:grid-cols-4', className)}>
      <Tile
        title="Your wedding site"
        note="Names, date and venue, on your own link"
        className="bg-brand-soft flex-col gap-1"
      >
        <span className="text-small text-ink-soft tracking-widest uppercase">Shubh Vivah</span>
        <span className="font-script text-heading leading-tight">Raadha &amp; Shyam</span>
      </Tile>

      <Tile
        title="Each guest by name"
        note="Every guest gets a link that greets them"
        className="bg-surface flex-col gap-1"
      >
        <span className="text-small text-ink-soft">Dear</span>
        <span className="font-script text-heading decoration-butter leading-tight underline decoration-2 underline-offset-4">
          Sharma ji
        </span>
      </Tile>

      <Tile title="Opens from WhatsApp" note="No app to install, for anyone" className="bg-sunken">
        <span className="bg-soda rounded-input text-small flex flex-col px-3 py-2 text-left">
          <span className="font-semibold">Raadha weds Shyam</span>
          <span>Tap to open 💌</span>
        </span>
      </Tile>

      <Tile
        title="An envelope to open"
        note="Guests tap the seal, and petals fall"
        className="bg-peach"
      >
        <Envelope />
      </Tile>

      <Tile
        title="A live countdown"
        note="Days to go, ticking on every invite"
        className="bg-grape flex-col"
      >
        <span className="font-weighted text-title leading-none font-bold">120</span>
        <span className="text-small">days to go</span>
      </Tile>

      <Tile title="Venue on the map" note="One tap opens Google Maps" className="bg-soda/40 p-0">
        <VenueMap />
      </Tile>

      <Tile
        title="RSVP on WhatsApp"
        note="Guests answer you in one tap"
        className="bg-butter flex-col gap-2"
      >
        <span className="font-script text-heading leading-tight">Will you come?</span>
        <span className="bg-whatsapp text-surface rounded-pill text-small flex items-center gap-1.5 px-3 py-1 font-semibold">
          <WhatsAppIcon className="size-4" />
          Reply
        </span>
      </Tile>

      <Tile
        title="Your own link"
        note="Easy to type, easy to remember"
        className="bg-surface flex-col"
      >
        <span className="font-display text-body sm:text-heading leading-tight">raadha-shyam</span>
        <span className="text-small text-ink-soft">.vivah.online</span>
      </Tile>
    </ul>
  );
}

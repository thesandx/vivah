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

/** Three date cards: the day scratched open, the month and year still under gold foil. */
function ScratchDate() {
  return (
    <span className="flex items-center gap-2">
      <span className="bg-surface shadow-hard rounded-input font-weighted text-heading grid size-10 place-items-center font-bold sm:size-12">
        14
      </span>
      <span className="bg-butter shadow-hard rounded-input grid size-10 place-items-center sm:size-12">
        ✨
      </span>
      <span className="bg-butter shadow-hard rounded-input grid size-10 place-items-center sm:size-12">
        ✨
      </span>
    </span>
  );
}

/** Music notes beside the round speaker button that plays and pauses the song. */
function SongButton() {
  return (
    <span className="flex items-center gap-3">
      <span className="font-script text-title leading-none">♪ ♫</span>
      <span className="bg-surface shadow-hard grid size-11 place-items-center rounded-full">
        <svg
          viewBox="0 0 24 24"
          className="stroke-ink size-6 fill-none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </svg>
      </span>
    </span>
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
        note="Shri Ganesh, your names, the date and the venue"
        className="bg-brand-soft flex-col gap-1"
      >
        <span className="text-small text-ink-soft">॥ श्री गणेशाय नमः ॥</span>
        <span className="font-script text-heading leading-tight">Raadha &amp; Shyam</span>
      </Tile>

      <Tile
        title="Opens with their name"
        note="A Shri Ganesh card says “Hi” and waits for a tap"
        className="bg-peach flex-col gap-1"
      >
        <span className="font-script text-heading decoration-butter leading-tight underline decoration-2 underline-offset-4">
          Hi Sharma ji
        </span>
        <span className="text-small">Tap to open your invitation</span>
      </Tile>

      <Tile
        title="Opens from WhatsApp"
        note="A card with your names shows in the chat"
        className="bg-sunken"
      >
        <span className="bg-soda rounded-input text-small flex flex-col px-3 py-2 text-left">
          <span className="font-semibold">Raadha weds Shyam</span>
          <span>Hi Sharma ji 🙏</span>
        </span>
      </Tile>

      <Tile
        title="Scratch to see the date"
        note="Gold foil cards hide the day, month and year"
        className="bg-grape"
      >
        <ScratchDate />
      </Tile>

      <Tile
        title="A live countdown"
        note="Days to go, then a blessing after the wedding"
        className="bg-butter flex-col"
      >
        <span className="font-weighted text-title leading-none font-bold">120</span>
        <span className="text-small">days to go</span>
      </Tile>

      <Tile title="Venue on the map" note="One tap opens Google Maps" className="bg-soda/40 p-0">
        <VenueMap />
      </Tile>

      <Tile title="Your song" note="It plays when the guest taps to open" className="bg-blush">
        <SongButton />
      </Tile>

      <Tile
        title="RSVP on WhatsApp"
        note="A reply to you, already typed"
        className="bg-surface flex-col gap-2"
      >
        <span className="font-script text-heading leading-tight">Will you join us?</span>
        <span className="bg-whatsapp-deep text-surface rounded-pill text-small flex items-center gap-1.5 px-3 py-1 font-semibold">
          <WhatsAppIcon className="size-4" />
          Reply
        </span>
      </Tile>
    </ul>
  );
}

import { cn } from '@/lib/utils';

/**
 * "Everything in your invite": the home page's feature list, an icon and two
 * lines each. A Server Component.
 *
 * Every entry is a feature the invite has today. Do not add one that is not
 * built.
 */

const ICONS = {
  guests:
    'M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 9v-1a4 4 0 0 0-3-3.9M15 4.1a3 3 0 0 1 0 5.8',
  name: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  edit: 'M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  timer: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  map: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  reply: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z',
  diya: 'M12 3c2 3 4 4.5 4 7.5a4 4 0 0 1-8 0C8 7.5 10 6 12 3ZM4 16h16l-2.5 5h-11L4 16Z',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  calendar:
    'M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
} as const;

/**
 * The fill behind each icon. A spread of festival tones keeps the list lively;
 * the icon stays in ink, which reads on every one of them.
 */
const TONES: Record<keyof typeof ICONS, string> = {
  name: 'bg-brand-soft',
  guests: 'bg-butter',
  link: 'bg-soda',
  edit: 'bg-grape',
  timer: 'bg-peach',
  map: 'bg-success-soft',
  reply: 'bg-butter',
  diya: 'bg-peach',
  sparkle: 'bg-butter',
  music: 'bg-blush',
  calendar: 'bg-success-soft',
  eye: 'bg-soda',
};

const FEATURES: readonly { icon: keyof typeof ICONS; title: string; body: string }[] = [
  {
    icon: 'name',
    title: 'Each guest by name',
    body: 'Every guest gets a link that opens with their own name.',
  },
  {
    icon: 'guests',
    title: 'Share with every guest',
    body: 'Send it to as many people as you like. No charge per guest.',
  },
  {
    icon: 'link',
    title: 'Your own link',
    body: 'Your names in the address, like raadha-shyam.vivah.online.',
  },
  {
    icon: 'edit',
    title: 'Your own dashboard',
    body: 'Make guest links, and change the venue, time or song any time. Every link updates.',
  },
  { icon: 'timer', title: 'Live countdown', body: 'Days, hours and minutes to your wedding.' },
  { icon: 'map', title: 'Venue with maps', body: 'One tap opens the way on Google Maps.' },
  { icon: 'reply', title: 'RSVP on WhatsApp', body: 'Guests reply to you in one tap.' },
  {
    icon: 'diya',
    title: 'Opens with Shri Ganesh',
    body: 'A Ganesh card greets each guest by name. One tap opens the invite.',
  },
  {
    icon: 'sparkle',
    title: 'Scratch to see the date',
    body: 'Guests scratch gold foil cards to reveal the day, month and year.',
  },
  {
    icon: 'music',
    title: 'Your song',
    body: 'It starts when the guest taps to open, never by itself.',
  },
  {
    icon: 'calendar',
    title: 'Add to calendar',
    body: 'Guests save your wedding to Google Calendar in one tap.',
  },
  { icon: 'eye', title: 'Free preview', body: 'See your whole invite before you pay.' },
];

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="stroke-ink size-6 fill-none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export interface FeatureListProps {
  className?: string;
}

export function FeatureList({ className }: FeatureListProps) {
  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3', className)}>
      {FEATURES.map((feature) => (
        <li
          key={feature.title}
          className="bg-surface shadow-hard rounded-card flex items-start gap-4 p-5"
        >
          <span
            className={cn(
              'rounded-input grid size-12 shrink-0 place-items-center',
              TONES[feature.icon],
            )}
          >
            <Icon path={ICONS[feature.icon]} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-heading font-display font-semibold">{feature.title}</span>
            <span className="text-ink-soft">{feature.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

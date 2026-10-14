import Image from 'next/image';

import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { type ChatShot, isPublishedChat } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

export interface ChatShotCardProps {
  chat: ChatShot;
  /** Tilt the polaroid left or right, so a row of them looks pinned by hand. */
  tilt: 'left' | 'right';
  className?: string;
}

const APP = {
  whatsapp: { name: 'WhatsApp', bar: 'bg-whatsapp', mine: 'bg-soda' },
  instagram: {
    name: 'Instagram',
    bar: 'bg-linear-to-r from-butter via-brand to-grape',
    mine: 'bg-grape',
  },
} as const;

/** The Instagram mark: a rounded square with a lens. */
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
      <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" className="fill-current" strokeWidth="0" />
    </svg>
  );
}

/** Chat bubbles in outline: the shape of a chat, with no words in it. */
function EmptyChat({ app }: { app: ChatShot['app'] }) {
  const bubbles = [
    { mine: false, width: 'w-3/4' },
    { mine: true, width: 'w-2/3' },
    { mine: false, width: 'w-1/2' },
    { mine: true, width: 'w-4/5' },
  ];
  return (
    <div aria-hidden="true" className="bg-sunken flex h-full flex-col gap-2.5 p-3">
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className={cn(
            'rounded-input block h-7',
            bubble.width,
            bubble.mine ? cn('self-end', APP[app].mine) : 'bg-surface self-start',
          )}
        />
      ))}
    </div>
  );
}

/**
 * One polaroid in the home page's chat carousel: a screenshot of a message a
 * couple got on WhatsApp or Instagram. A Server Component.
 *
 * An entry with no screenshot yet shows an empty chat in the same frame, so
 * the row keeps its look and claims nothing. See `lib/testimonials.ts`.
 */
export function ChatShotCard({ chat, tilt, className }: ChatShotCardProps) {
  const app = APP[chat.app];
  const published = isPublishedChat(chat);

  return (
    <figure
      className={cn(
        'bg-surface shadow-hard-lg flex w-56 flex-col gap-3 p-3 pb-4 sm:w-64',
        tilt === 'left' ? '-rotate-2' : 'rotate-2',
        className,
      )}
    >
      <div className="rounded-box flex flex-col overflow-hidden">
        <div className={cn('text-ink flex items-center gap-2 px-3 py-2', app.bar)}>
          {chat.app === 'whatsapp' ? <WhatsAppIcon /> : <InstagramIcon />}
          <span className="text-small font-semibold">{app.name}</span>
        </div>
        <div className="relative aspect-3/4">
          {published ? (
            <Image src={chat.image} alt={chat.alt} fill sizes="256px" className="object-cover" />
          ) : (
            <EmptyChat app={chat.app} />
          )}
        </div>
      </div>
      <figcaption className="font-script text-heading text-center">
        {published ? `From ${app.name}` : `A note on ${app.name}`}
      </figcaption>
    </figure>
  );
}

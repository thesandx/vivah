'use client';

import { useState } from 'react';

import { type PublishOutcome, type SlugCheck, SlugPicker } from '@/components/invite/SlugPicker';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * The banner at the foot of the couple's preview. Closed, it is one warm
 * line and one button: "It's almost yours". Open, it says what publishing
 * gives them, shows their address, the price once, and the publish button.
 *
 * It is written to the couple, not at a buyer: the invite is already theirs
 * to look at, and this is the last small step to send it. The price shows
 * before they publish, as the terms promise, but it is not the headline.
 *
 * A Client Component for the open state. The address check and the publish
 * are Server Actions the page passes in, through `SlugPicker`.
 */

export interface PublishBannerProps {
  bride: string;
  groom: string;
  leadId: string;
  /** The address the couple chose, checked free just now. */
  chosen?: string;
  /** Free addresses, for when there is no `chosen` one. */
  suggestions: readonly string[];
  /** `vivah.online`. */
  domainLabel: string;
  /** The one-time price, in rupees. */
  priceRupees: number;
  /** Whether the couple chose a song, so the copy only promises what is there. */
  hasSong?: boolean;
  /** Shown above the address when the chosen one was taken meanwhile. */
  notice?: React.ReactNode;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>;
  className?: string;
}

/** What publishing gives the couple, in their words. */
const PROMISES = [
  'Your own address to share on WhatsApp',
  'A personal link for every guest, with their name on the envelope',
  'RSVPs straight to your WhatsApp',
  'Add your venue, time and map any time from your dashboard',
] as const;

function Heart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-brand mt-1 size-4 shrink-0">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

export function PublishBanner({
  bride,
  groom,
  leadId,
  chosen,
  suggestions,
  domainLabel,
  priceRupees,
  hasSong = false,
  notice,
  checkSlug,
  publish,
  className,
}: PublishBannerProps): React.JSX.Element {
  const [open, setOpen] = useState(notice !== undefined);

  return (
    <>
      {open && (
        // Dims the invite behind the open banner; a tap on it closes the banner.
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="bg-ink/40 animate-fade-in fixed inset-0"
        />
      )}
      <section
        aria-label="Make this invite yours"
        className={cn(
          'bg-surface border-line rounded-t-sheet relative mx-auto flex w-full max-w-xl flex-col border-2 border-b-0 px-5 pt-4 pb-4 font-display',
          open ? 'gap-4' : 'gap-3',
          open && 'max-h-[88dvh] overflow-y-auto',
          className,
        )}
      >
        {!open ? (
          <>
            <div className="flex flex-col items-center text-center">
              <p className="font-script text-title text-brand">
                {bride} &amp; {groom}, it&apos;s almost yours
              </p>
              <p className="text-body text-ink-soft italic">
                One small step, and every guest sees it just like this.
              </p>
            </div>
            <Button type="button" variant="primary" block onClick={() => setOpen(true)}>
              Make it ours
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-small text-gold tracking-widest uppercase">
                  {bride} &amp; {groom}
                </p>
                <h2 className="font-script text-title text-brand">Your invite is ready to go</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="squish border-line text-ink-soft rounded-pill inline-grid size-11 shrink-0 place-items-center border-2"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <p className="text-heading text-ink-soft italic">
              {hasSong
                ? 'Everyone you love will open it just as you did: the seal, your song, your day.'
                : 'Everyone you love will open it just as you did: the seal, your names, your day.'}
            </p>

            <ul className="text-ink flex flex-col gap-2">
              {PROMISES.map((line) => (
                <li key={line} className="text-heading flex gap-2">
                  <Heart />
                  {line}
                </li>
              ))}
            </ul>

            {notice}

            <SlugPicker
              leadId={leadId}
              {...(chosen !== undefined && { chosen })}
              suggestions={suggestions}
              domainLabel={domainLabel}
              checkSlug={checkSlug}
              publish={publish}
              actionLabel={`Publish our invite · ₹${priceRupees.toLocaleString('en-IN')}`}
            />

            <p className="text-small text-ink-soft text-center">
              Paid once. No charge per guest. Only this phone can open this preview, for 48 hours.
            </p>
          </>
        )}
      </section>
    </>
  );
}

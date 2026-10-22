import Link from 'next/link';

import { Button } from '@/components/ui/Button';

export interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Asks before the Google Ads cookie, as the privacy page promises. Two equal
 * choices: "No thanks" is as easy to press as "Accept". It sits above the
 * page's floating buttons until the visitor answers, then never shows again
 * in this browser.
 */
export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  return (
    <section
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6"
    >
      <div className="bg-surface border-line rounded-card shadow-hard mx-auto flex max-w-2xl flex-col gap-3 border-2 p-4 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-small text-body flex-1">
          We use a Google Ads cookie to learn which ads bring couples to us. Nothing is stored
          unless you accept.{' '}
          <Link
            href="/privacy"
            className="text-ink decoration-brand underline decoration-2 underline-offset-4"
          >
            Privacy policy
          </Link>
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onDecline}>
            No thanks
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={onAccept}>
            Accept
          </Button>
        </div>
      </div>
    </section>
  );
}

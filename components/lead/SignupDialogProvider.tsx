'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HEART_THREAD_MS, HeartThread } from '@/components/lead/HeartThread';
import { LeadForm } from '@/components/lead/LeadForm';
import { Dialog } from '@/components/ui/Dialog';
import { SignupDialogContext, type SignupDialogState } from '@/hooks/useSignupDialog';
import { detailsPageUrl, LANDING_REFERRER_KEY } from '@/lib/details-link';

/**
 * The home page's second way in: every call to action below the hero opens
 * this, instead of scrolling back to the top. A tap plays the heart thread,
 * then a dialog rises with the same three-step sign-up card as the hero, and
 * nothing else.
 *
 * The dialog stays mounted while it is closed, so a couple who closes it
 * halfway finds their names still there when they open it again.
 *
 * An address that ends in `#details` (ads, bio links) belongs to the form's
 * own page, `/details`. An inline script in the root layout moves there
 * before the home page draws. This provider does the same after hydration,
 * for a host the script does not know and for a later change of the hash.
 *
 * A Client Component for the state. The page passes its sections as
 * `children`, so they stay Server Components.
 */

/**
 * The move to the form page, on an object so a test can watch it: jsdom
 * cannot leave the page, and `location.replace` cannot be replaced.
 */
export const detailsNavigation = {
  replace: (url: string): void => window.location.replace(url),
};

/** How long the heart thread takes to fade once the dialog is up. */
const LEAVE_MS = 300;

/** The id of the dialog card's heading. The hero card uses `start`. */
const DIALOG_HEADING_ID = 'signup-dialog-heading';

type Phase = 'idle' | 'drawing' | 'leaving';

export interface SignupDialogProviderProps {
  children: React.ReactNode;
}

export function SignupDialogProvider({ children }: SignupDialogProviderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [open, setOpen] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  const openSignup = useCallback(() => {
    if (phase !== 'idle' || open) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(true);
      return;
    }
    setPhase('drawing');
    later(HEART_THREAD_MS, () => {
      setOpen(true);
      setPhase('leaving');
      later(LEAVE_MS, () => setPhase('idle'));
    });
  }, [phase, open, later]);

  // The hash is read in the browser only: it never reaches the server.
  useEffect(() => {
    const follow = () => {
      const target = detailsPageUrl(window.location.search, window.location.hash);
      if (target === null) return;
      try {
        if (document.referrer !== '') {
          window.sessionStorage.setItem(LANDING_REFERRER_KEY, document.referrer);
        }
      } catch {
        // Storage is off: the visit report then sees the home page as the referrer.
      }
      detailsNavigation.replace(target);
    };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const state = useMemo<SignupDialogState>(
    () => ({ openSignup, isActive: open || phase !== 'idle' }),
    [openSignup, open, phase],
  );

  return (
    <SignupDialogContext value={state}>
      {children}
      {phase !== 'idle' && <HeartThread phase={phase} />}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Make your wedding website"
        titleHidden
      >
        <LeadForm headingId={DIALOG_HEADING_ID} place="dialog" />
      </Dialog>
    </SignupDialogContext>
  );
}

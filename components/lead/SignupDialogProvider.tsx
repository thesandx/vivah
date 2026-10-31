'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HEART_THREAD_MS, HeartThread } from '@/components/lead/HeartThread';
import { LeadForm } from '@/components/lead/LeadForm';
import { SignupScreen } from '@/components/lead/SignupScreen';
import { Dialog } from '@/components/ui/Dialog';
import { SignupDialogContext, type SignupDialogState } from '@/hooks/useSignupDialog';
import { isDetailsHash, tidyDetailsUrl } from '@/lib/details-link';

/**
 * The home page's second way in: every call to action below the hero opens
 * this, instead of scrolling back to the top. A tap plays the heart thread,
 * then a dialog rises with the same three-step sign-up card as the hero, and
 * nothing else.
 *
 * The dialog stays mounted while it is closed, so a couple who closes it
 * halfway finds their names still there when they open it again.
 *
 * It also holds the home page's third way in: an address that ends in
 * `#details`, the link in ads and in the Instagram and Facebook bios. That
 * opens the same card on a screen of its own (`SignupScreen`) at once, with
 * no heart thread, so the visitor lands on the form. Closing it takes the
 * hash off the address, and the home page is behind it.
 *
 * A Client Component for the state. The page passes its sections as
 * `children`, so they stay Server Components.
 */

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
  const [screenOpen, setScreenOpen] = useState(false);
  /** The screen mounts on its first open, and then stays, so typed names survive a close. */
  const [screenSeen, setScreenSeen] = useState(false);
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

  // The hash is read in the browser only: it never reaches the server. A
  // link on the page to `#details` opens it too, and Back closes it.
  //
  // Tags that an ad tool put after `#details` move into the query string
  // first. This effect runs before `VisitTracker`'s, its parent's, so the
  // visit report still sees them.
  useEffect(() => {
    const follow = () => {
      const { pathname, search, hash } = window.location;
      const tidy = tidyDetailsUrl(pathname, search, hash);
      if (tidy !== null) window.history.replaceState(window.history.state, '', tidy);
      const asked = isDetailsHash(hash);
      setScreenOpen(asked);
      if (asked) setScreenSeen(true);
    };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const closeScreen = useCallback(() => {
    setScreenOpen(false);
    // Off the address, so a reload shows the home page and the link works again.
    if (isDetailsHash(window.location.hash)) {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${search}`);
    }
  }, []);

  const state = useMemo<SignupDialogState>(
    () => ({ openSignup, isActive: open || screenOpen || phase !== 'idle' }),
    [openSignup, open, screenOpen, phase],
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
      {screenSeen && <SignupScreen open={screenOpen} onClose={closeScreen} />}
    </SignupDialogContext>
  );
}

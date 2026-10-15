'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HEART_THREAD_MS, HeartThread } from '@/components/lead/HeartThread';
import { LeadForm } from '@/components/lead/LeadForm';
import { Dialog } from '@/components/ui/Dialog';
import { SignupDialogContext, type SignupDialogState } from '@/hooks/useSignupDialog';

/**
 * The home page's second way in: every call to action below the hero opens
 * this, instead of scrolling back to the top. A tap plays the heart thread,
 * then a dialog rises with the same three-step sign-up card as the hero, and
 * nothing else.
 *
 * The dialog stays mounted while it is closed, so a couple who closes it
 * halfway finds their names still there when they open it again.
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
        <LeadForm headingId={DIALOG_HEADING_ID} />
      </Dialog>
    </SignupDialogContext>
  );
}

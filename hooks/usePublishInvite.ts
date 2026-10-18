'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** What the publish Server Action answers. */
export type PublishOutcome =
  | {
      ok: true;
      url: string;
      /** `payment` when `url` is Cashfree's page, not the live invite. */
      to?: 'payment' | 'invite';
    }
  | { ok: false; message: string; taken?: boolean };

export interface PublishInviteState {
  /** `working` from the tap, `done` once the invite is live and opening. */
  status: 'idle' | 'working' | 'done';
  error: string | null;
  setError: (error: string | null) => void;
  /** Publishes the invite at `slug`. A second call while one runs does nothing. */
  run: (slug: string) => Promise<void>;
}

/**
 * The publish step on the preview page, shared by the pay button in the
 * checkout (`SlugPicker`) and the one on the closed sheet (`PublishBanner`),
 * so both behave the same: one publish at a time, the live invite opens on
 * success, and a failure becomes a sentence the couple can act on.
 *
 * When another couple published the address meanwhile, `onTaken` decides
 * what happens and returns the sentence to show. The default reloads the
 * page, which checks the address again and offers free ones instead.
 */
export function usePublishInvite(
  leadId: string,
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>,
  onTaken?: (message: string) => string,
): PublishInviteState {
  const [status, setStatus] = useState<PublishInviteState['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  // A ref, not the state, so two taps in one frame still publish once.
  const busy = useRef(false);

  // Back from Cashfree's page, the browser may restore this page from its
  // back-forward cache with the button still busy. Free it again.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      busy.current = false;
      setStatus('idle');
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const run = useCallback(
    async (slug: string): Promise<void> => {
      if (busy.current) return;
      busy.current = true;
      setStatus('working');
      setError(null);
      try {
        const result = await publish(leadId, slug);
        if (result.ok) {
          // Opening the payment page keeps the button's working words.
          if (result.to !== 'payment') setStatus('done');
          window.location.assign(result.url);
          return;
        }
        if (result.taken === true) {
          if (onTaken === undefined) {
            window.location.reload();
            return;
          }
          setError(onTaken(result.message));
        } else {
          setError(result.message);
        }
      } catch {
        setError('Your invite was not published. Check your connection and try again.');
      }
      busy.current = false;
      setStatus('idle');
    },
    [leadId, publish, onTaken],
  );

  return { status, error, setError, run };
}

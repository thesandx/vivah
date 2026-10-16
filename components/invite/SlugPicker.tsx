'use client';

import { useCallback, useState } from 'react';

import {
  AddressChoice,
  type AddressValue,
  chosenSlug,
  CUSTOM,
  initialAddress,
  type SlugCheck,
} from '@/components/invite/AddressChoice';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export type { SlugCheck };

/**
 * The publish step on the preview page.
 *
 * The couple chose their address on the sign-up card (step 3), so the page
 * normally passes it as `chosen`, and this shows it with the publish button.
 * The radio list appears only when there is no chosen address: another couple
 * published it after the sign-up, or the lead is older than step 3.
 *
 * A Client Component because it handles the button. The checks and the
 * publish run on the server, through the two functions the page passes in
 * (Server Actions), so this file imports nothing from `services/`.
 */

export type PublishOutcome =
  { ok: true; url: string } | { ok: false; message: string; taken?: boolean };

export interface SlugPickerProps {
  leadId: string;
  /** The address the couple chose on the sign-up card, checked free just now. */
  chosen?: string;
  /** Free addresses, best first, for when there is no `chosen` address. */
  suggestions: readonly string[];
  /** The part after the slug, as the couple reads it: `vivah.online`. */
  domainLabel: string;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>;
  /** The publish button's words. Default: "Pay and publish". */
  actionLabel?: string;
  /** The button's words while it works. Default: "Publishing your invite". */
  workingLabel?: string;
  /** Shown between the address and the button: the order summary. */
  children?: React.ReactNode;
  /** Shown under the button: who takes the payment, and the refund promise. */
  footer?: React.ReactNode;
  className?: string;
}

export function SlugPicker({
  leadId,
  chosen,
  suggestions,
  domainLabel,
  checkSlug,
  publish,
  actionLabel = 'Pay and publish',
  workingLabel = 'Publishing your invite',
  children,
  footer,
  className,
}: SlugPickerProps): React.JSX.Element {
  const [offered, setOffered] = useState<readonly string[]>(suggestions);
  const [address, setAddress] = useState<AddressValue>(() => initialAddress(suggestions));
  const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Stable, because AddressChoice runs its availability check from an effect.
  const changeAddress = useCallback((next: React.SetStateAction<AddressValue>) => {
    setAddress(next);
    setError(null);
  }, []);

  const slug = chosen ?? chosenSlug(address);
  const ready = status === 'idle' && slug !== null;

  async function handlePublish(): Promise<void> {
    if (slug === null) return;
    setStatus('working');
    setError(null);
    try {
      const result = await publish(leadId, slug);
      if (result.ok) {
        setStatus('done');
        window.location.assign(result.url);
        return;
      }
      if (result.taken === true) {
        if (chosen !== undefined) {
          // Another couple published this address after the sign-up. The page
          // checks again on load and offers free addresses instead.
          window.location.reload();
          return;
        }
        if (address.choice === CUSTOM) {
          setAddress((previous) => ({
            ...previous,
            check: { kind: 'problem', message: 'This address is taken. Try another.' },
          }));
          setError(result.message);
        } else {
          // Another couple published our suggestion a moment ago. Drop it
          // quietly and move to the next one, rather than say "taken".
          const remaining = offered.filter((item) => item !== address.choice);
          setOffered(remaining);
          setAddress(initialAddress(remaining));
          setError('That address was just published by another couple. Choose again.');
        }
      } else {
        setError(result.message);
      }
    } catch {
      setError('Your invite was not published. Check your connection and try again.');
    }
    setStatus('idle');
  }

  const working = status !== 'idle';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {chosen !== undefined ? (
        <div className="bg-pay-well border-pay-line rounded-input flex flex-col border-2 px-4 py-3">
          <p className="text-small text-pay-body">Your invite address</p>
          <p className="text-body text-pay-ink font-semibold break-all">
            {chosen}.{domainLabel}
          </p>
        </div>
      ) : (
        <AddressChoice
          suggestions={offered}
          domainLabel={domainLabel}
          checkSlug={checkSlug}
          value={address}
          onChange={changeAddress}
        />
      )}

      {children}

      {status === 'done' && <Alert tone="success" title="Your invite is live. Opening it now." />}
      {error !== null && (
        <Alert tone="danger" title="Your invite was not published.">
          {error}
        </Alert>
      )}

      {/* The one green thing on the sheet. Three looks: ready, working (a
          spinner, the words say what is happening, and a second tap does
          nothing), and not ready (grey, until an address is chosen). */}
      <button
        type="button"
        disabled={!ready}
        aria-busy={working}
        onClick={() => {
          void handlePublish();
        }}
        className={cn(
          'rounded-input text-body inline-flex min-h-14 w-full items-center justify-center gap-3 px-5 font-semibold tabular-nums transition-colors select-none',
          working && 'bg-pay-action-deep text-on-brand cursor-wait',
          !working &&
            ready &&
            'bg-pay-action text-on-brand hover:bg-pay-action-deep active:translate-y-px',
          !working && !ready && 'bg-pay-disabled text-pay-body cursor-not-allowed',
        )}
      >
        {working ? (
          <>
            <span
              aria-hidden="true"
              className="border-on-brand/30 border-t-on-brand inline-block size-5 shrink-0 animate-spin rounded-full border-2"
            />
            {status === 'done' ? 'Opening your invite' : workingLabel}
          </>
        ) : (
          actionLabel
        )}
      </button>

      {footer}
    </div>
  );
}

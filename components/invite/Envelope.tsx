'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

/**
 * The opening of a couple's invite: a sealed envelope that greets the guest
 * by name ("Hi Kartheek"). A tap breaks the seal, opens the flap and drops the
 * envelope away, and the invite underneath shows.
 *
 * A Client Component because it holds the open state and handles the tap.
 * The invite itself is rendered on the server and passed in as `children`, so
 * it is in the HTML from the first byte (for search engines and slow phones)
 * and only covered until the guest taps.
 *
 * A guest who opened this invite before skips the envelope: the browser
 * remembers it under `rememberKey`. Storage can be blocked (private mode), so
 * every access is guarded and the envelope simply shows again.
 */

/** How long the opening runs: the last animation ends at 680 + 520 ms. */
const OPENING_MS = 1200;

type Phase = 'closed' | 'opening' | 'open';

export interface EnvelopeProps {
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  /** The seal's letters, e.g. `R & S`. */
  initials: string;
  /** The storage key that remembers this guest opened this invite. */
  rememberKey: string;
  children: React.ReactNode;
}

function remembered(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function remember(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage is blocked. The envelope shows again next time; nothing breaks.
  }
}

/** The remembered visit only changes when this component writes it. */
function subscribeToNothing(): () => void {
  return () => {};
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Envelope({
  guestName,
  initials,
  rememberKey,
  children,
}: EnvelopeProps): React.JSX.Element {
  // `null` until the guest acts: then the phase follows whether this browser
  // remembers an earlier visit. The server always renders the envelope.
  const [chosen, setChosen] = useState<Phase | null>(null);
  const seen = useSyncExternalStore(
    subscribeToNothing,
    () => remembered(rememberKey),
    () => false,
  );
  const phase: Phase = chosen ?? (seen ? 'open' : 'closed');

  useEffect(() => {
    if (phase !== 'opening') return;
    const timer = setTimeout(() => setChosen('open'), prefersReducedMotion() ? 0 : OPENING_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  function open(): void {
    remember(rememberKey);
    setChosen('opening');
  }

  const opening = phase === 'opening';

  return (
    <>
      {/* `inert` keeps keyboard and screen-reader focus out of the invite
          while the envelope covers it. */}
      <div inert={phase !== 'open'} className="flex flex-1 flex-col">
        {children}
      </div>

      {phase !== 'open' && (
        <div
          className={cn(
            'bg-paper fixed inset-0 z-50 flex flex-col items-center justify-center px-6',
            opening && 'animate-envelope-away',
          )}
        >
          <button
            type="button"
            onClick={open}
            disabled={opening}
            className="flex w-full max-w-sm flex-col items-center gap-8 text-center"
          >
            <span className="font-script text-hero text-brand">
              {guestName === null ? 'Hi, you are invited' : `Hi ${guestName}`}
            </span>

            <svg viewBox="0 0 300 200" aria-hidden="true" className="w-full">
              <rect
                x="2"
                y="2"
                width="296"
                height="196"
                rx="10"
                className="fill-brand stroke-butter"
                strokeWidth="3"
              />
              {/* The pocket's folds. */}
              <path
                d="M4 196 L150 100 L296 196"
                className="stroke-butter"
                strokeWidth="2"
                fill="none"
              />
              <g
                className={cn(opening && 'animate-flap-open')}
                style={{ transformBox: 'fill-box', transformOrigin: 'top' }}
              >
                <path
                  d="M2 12 Q2 2 12 2 L288 2 Q298 2 298 12 L150 112 Z"
                  className="fill-brand stroke-butter"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>
              <g
                className={cn(opening && 'animate-seal-break')}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <circle
                  cx="150"
                  cy="112"
                  r="30"
                  className="fill-butter stroke-brand-soft"
                  strokeWidth="3"
                />
                <circle
                  cx="150"
                  cy="112"
                  r="23"
                  className="stroke-brand"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  fill="none"
                />
                <text
                  x="150"
                  y="119"
                  textAnchor="middle"
                  className="fill-brand font-display text-body font-semibold"
                >
                  {initials}
                </text>
              </g>
            </svg>

            <span className="font-display text-title text-ink">Tap to open our wedding invite</span>
          </button>
        </div>
      )}
    </>
  );
}

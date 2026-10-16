'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { FallingPetals } from '@/components/invite/FallingPetals';
import { SoundButton } from '@/components/invite/SoundButton';
import { cn } from '@/lib/utils';

/**
 * The opening of a couple's invite: a sealed envelope with the couple's
 * initials on a wax stamp, greeting the guest by name ("Hi Kartheek"). A tap
 * on it starts the couple's song, breaks the seal, opens the flap, lifts the
 * letter out, and the invite underneath settles into view.
 *
 * The tap is the browser's "user gesture", so the song may start with sound.
 * Browsers refuse audio that starts on its own, and the PRD forbids autoplay
 * anyway. After the opening, a round button in the corner pauses and plays it.
 *
 * A Client Component because it holds the open state, the audio and the tap.
 * The invite itself is rendered on the server and passed in as `children`, so
 * it is in the HTML from the first byte (for search engines and slow phones)
 * and only covered until the guest taps.
 *
 * A guest who opened this invite before skips the envelope: the browser
 * remembers it under `rememberKey`. Storage can be blocked (private mode), so
 * every access is guarded and the envelope simply shows again. The couple's
 * preview passes no key, so the envelope shows every time.
 */

/** How long the opening runs: the last animation ends at 1300 + 560 ms. */
const OPENING_MS = 1900;

type Phase = 'closed' | 'opening' | 'open';

export interface EnvelopeProps {
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  /** The seal's letters, e.g. `R & S`. */
  initials: string;
  /** The couple's names, written on the letter inside: `Riya & Arjun`. */
  couple: string;
  /** The storage key that remembers this guest opened this invite. Omit to always show it. */
  rememberKey?: string;
  /** The couple's song. The tap that opens the envelope starts it. */
  song?: { name: string; src: string } | null;
  /** Pinned to the top of the screen at every phase, over the envelope too. */
  top?: React.ReactNode;
  /** Pinned to the bottom of the screen once the invite is open. */
  dock?: React.ReactNode;
  children: React.ReactNode;
}

function remembered(key: string | undefined): boolean {
  if (key === undefined) return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function remember(key: string | undefined): void {
  if (key === undefined) return;
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

/** The wax stamp: a scalloped rose disc with the initials in gold. */
function WaxSeal({ initials }: { initials: string }) {
  // 16 bumps round the edge, as wax spreads under a stamp.
  const bumps = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { cx: 50 + Math.cos(angle) * 40, cy: 50 + Math.sin(angle) * 40 };
  });
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full">
      {bumps.map(({ cx, cy }) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" className="fill-brand" />
      ))}
      <circle cx="50" cy="50" r="41" className="fill-brand" />
      <circle cx="50" cy="50" r="33" className="fill-brand-deep" opacity="0.35" />
      <circle
        cx="50"
        cy="50"
        r="31"
        className="stroke-butter"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        fill="none"
      />
      {/* The shine on the wax. */}
      <path
        d="M24 36 A30 30 0 0 1 46 20"
        className="stroke-surface"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        className="fill-butter font-display text-heading font-semibold"
      >
        {initials}
      </text>
    </svg>
  );
}

export function Envelope({
  guestName,
  initials,
  couple,
  rememberKey,
  song = null,
  top,
  dock,
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
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (phase !== 'opening') return;
    const timer = setTimeout(() => setChosen('open'), prefersReducedMotion() ? 0 : OPENING_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // The song stops while the guest is in another app or tab, and carries on
  // when they come back, as a music app does.
  useEffect(() => {
    const element = audio.current;
    if (element === null) return;
    let resume = false;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        resume = !element.paused;
        element.pause();
      } else if (resume) {
        resume = false;
        void element.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  function open(): void {
    // Start the song inside the tap: it is the gesture that allows sound.
    audio.current?.play().catch(() => setPlaying(false));
    remember(rememberKey);
    setChosen('opening');
  }

  function toggleSong(): void {
    const element = audio.current;
    if (element === null) return;
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  }

  const opening = phase === 'opening';
  const showDock = phase === 'open';

  return (
    <>
      {/* `inert` keeps keyboard and screen-reader focus out of the invite
          while the envelope covers it. */}
      <div
        inert={phase !== 'open'}
        className={cn('flex flex-1 flex-col', chosen !== null && 'animate-invite-in')}
        style={chosen !== null ? { animationDelay: '1200ms' } : undefined}
      >
        {children}
      </div>

      {top !== undefined && (
        // Above the envelope (z-50). There is no z-index token above 50.
        <div
          className="pointer-events-none fixed inset-x-0 top-0 flex justify-center"
          style={{ zIndex: 60 }}
        >
          <div className="pointer-events-auto">{top}</div>
        </div>
      )}

      {song !== null && (
        <audio
          ref={audio}
          src={song.src}
          preload="metadata"
          loop
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        />
      )}

      {showDock && song !== null && (
        // Pinned to the top right, so the guest can turn the song off or on
        // from anywhere on the page. Below the preview notch when there is one.
        <SoundButton
          playing={playing}
          title={song.name}
          onToggle={toggleSong}
          className={cn(
            'animate-pop fixed right-4 z-40',
            top === undefined
              ? 'top-[max(0.75rem,env(safe-area-inset-top))]'
              : 'top-[calc(env(safe-area-inset-top)+4rem)]',
          )}
        />
      )}

      {showDock && dock !== undefined && (
        <div className="animate-rise-in fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          {dock}
        </div>
      )}

      {phase !== 'open' && (
        <div
          className={cn(
            'bg-paper fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6',
            opening && 'animate-envelope-away',
          )}
        >
          <FallingPetals className="-z-10" />
          <button
            type="button"
            onClick={open}
            disabled={opening}
            aria-label={`${guestName === null ? 'You are invited' : `Hi ${guestName}`}. Tap to open our wedding invite`}
            className="flex w-full max-w-sm flex-col items-center gap-7 text-center"
          >
            <span className="flex flex-col items-center gap-1">
              <span className="font-display text-small text-gold tracking-widest uppercase">
                Shubh Vivah
              </span>
              <span className="font-script text-hero text-brand">
                {guestName === null ? 'You are invited' : `Hi ${guestName}`}
              </span>
            </span>

            {/* The envelope, from the back: inside, the letter, the pocket,
                the flap and the seal, stacked in that order. */}
            <span
              className="relative block aspect-3/2 w-full max-w-xs"
              style={{ perspective: '900px' }}
            >
              <span className="bg-peach rounded-input absolute inset-0" />
              <span
                className={cn(
                  'bg-surface border-line rounded-input absolute inset-x-4 top-3 bottom-3 z-10 flex flex-col items-center justify-start gap-1 border-2 pt-5',
                  opening && 'animate-letter-rise',
                )}
              >
                <span className="font-display text-small text-gold tracking-widest uppercase">
                  Together with their families
                </span>
                <span className="font-script text-title text-brand">{couple}</span>
              </span>
              <svg
                viewBox="0 0 300 200"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 z-20 size-full"
              >
                <path
                  d="M0 14 Q0 0 14 0 L150 112 L286 0 Q300 0 300 14 L300 186 Q300 200 286 200 L14 200 Q0 200 0 186 Z"
                  className="fill-brand-soft"
                />
                <path
                  d="M2 198 L150 104 L298 198"
                  className="stroke-surface"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-x-0 top-0 z-30 block h-3/5',
                  opening && 'animate-flap-open',
                )}
                style={{ transformOrigin: 'top', backfaceVisibility: 'visible' }}
              >
                <svg
                  viewBox="0 0 300 120"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="size-full"
                >
                  <path
                    d="M0 14 Q0 0 14 0 L286 0 Q300 0 300 14 L158 114 Q150 120 142 114 Z"
                    className="fill-brand-soft stroke-butter"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                className={cn(
                  'absolute top-3/5 left-1/2 z-40 block size-24 -translate-x-1/2 -translate-y-1/2',
                )}
              >
                <span
                  className={cn(
                    'block size-full',
                    opening ? 'animate-seal-break' : 'animate-seal-pulse',
                  )}
                >
                  <WaxSeal initials={initials} />
                </span>
              </span>
            </span>

            <span className="flex flex-col items-center gap-1">
              <span className="font-display text-title text-ink">Tap to open</span>
              {song !== null && (
                <span className="text-small text-ink-soft font-display italic">
                  Turn your sound on. Our song plays as it opens.
                </span>
              )}
            </span>
          </button>
        </div>
      )}
    </>
  );
}

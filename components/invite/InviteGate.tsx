'use client';

import { useEffect, useRef, useState } from 'react';

import { GaneshCover } from '@/components/invite/GaneshCover';
import { SoundButton } from '@/components/invite/SoundButton';
import { cn } from '@/lib/utils';

/**
 * The opening of a couple's invite: the Shri Ganesh card stands over the
 * invite on a dark rose glow, and greets the guest by name
 * ("Hi Neha"). A tap starts the couple's song, the dark cover dissolves,
 * and the card lifts up and off the screen with a soft gold light behind it.
 *
 * The invite is not hidden under the card, only covered, so it shows through
 * more and more as the cover fades. Nothing has to "appear" at the end, which
 * is a whole class of reveal bugs that cannot happen.
 *
 * The card is drawn in code (`GaneshCover`), not a photo, so it is sharp on
 * every screen and in the first bytes of the page. On a phone it fills the
 * screen; from `md` up it stands as a phone-shaped card on a dark rose glow.
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
 * The card shows on every visit, a refresh too, and always waits for the
 * tap. The song needs that tap, and a card that showed and then vanished by
 * itself read as a bug.
 *
 * While the card is up, the page behind it cannot scroll: a guest who swiped
 * at the card used to open the invite half way down. The page is held at the
 * top, and only a tap opens it: a swipe on the card does nothing.
 */

/** How long the opening runs: the card's lift ends at 40 + 1300 ms. */
const OPENING_MS = 1400;

type Phase = 'closed' | 'opening' | 'open';

export interface InviteGateProps {
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  /** The couple's names, for the screen reader's label: `Priya & Rahul`. */
  couple: string;
  /** The couple's song. The tap that opens the invite starts it. */
  song?: { name: string; src: string } | null;
  /** Pinned to the top of the screen at every phase, over the card too. */
  top?: React.ReactNode;
  /** Pinned to the bottom of the screen once the invite is open. */
  dock?: React.ReactNode;
  children: React.ReactNode;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function InviteGate({
  guestName,
  couple,
  song = null,
  top,
  dock,
  children,
}: InviteGateProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('closed');
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const locked = phase !== 'open';

  // Start at the top. A browser that restores the scroll position on a
  // reload would otherwise open the invite where the last visit left it.
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  // Hold the page still behind the card. `overflow: hidden` on the root stops
  // the wheel and the keyboard; the touchmove block stops iOS, which scrolls
  // the page under a fixed layer whatever the root's overflow says.
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    const block = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    document.addEventListener('touchmove', block, { passive: false });
    return () => {
      root.style.overflow = previous.overflow;
      root.style.overscrollBehavior = previous.overscroll;
      document.removeEventListener('touchmove', block);
    };
  }, [locked]);

  useEffect(() => {
    if (phase !== 'opening') return;
    const timer = setTimeout(() => setPhase('open'), prefersReducedMotion() ? 0 : OPENING_MS);
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
    if (started.current) return;
    started.current = true;
    // Start the song inside the tap: it is the gesture that allows sound.
    audio.current?.play().catch(() => setPlaying(false));
    window.scrollTo(0, 0);
    setPhase('opening');
  }

  function toggleSong(): void {
    const element = audio.current;
    if (element === null) return;
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  }

  const opening = phase === 'opening';
  const showDock = phase === 'open';
  const greeting = guestName === null ? 'You are invited' : `Hi ${guestName}`;

  return (
    <>
      {/* `inert` keeps keyboard and screen-reader focus out of the invite
          while the card covers it. */}
      <div inert={phase !== 'open'} className="flex flex-1 flex-col">
        {children}
      </div>

      {top !== undefined && (
        // Above the card (z-50). There is no z-index token above 50.
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
              : 'top-[calc(env(safe-area-inset-top)+7rem)]',
          )}
        />
      )}

      {showDock && dock !== undefined && (
        <div className="animate-rise-in fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
          {dock}
        </div>
      )}

      {phase !== 'open' && (
        // The cover itself is transparent: the dark colour lives on the wash
        // below, so when the wash fades the invite shows through.
        <button
          type="button"
          onClick={open}
          disabled={opening}
          aria-label={`${greeting}. Please tap to open your invitation from ${couple}`}
          className="fixed inset-0 z-50 block touch-none overflow-hidden overscroll-none select-none"
        >
          <span
            aria-hidden="true"
            className={cn('bg-plum-night absolute inset-0', opening && 'animate-gate-wash-out')}
            style={{
              backgroundImage:
                'radial-gradient(ellipse 60% 55% at 50% 45%, var(--color-rani-deep) 0%, transparent 100%)',
            }}
          >
            {/* A vignette, so the card reads as lit from the front. */}
            <span
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 70% 62% at 50% 46%, transparent 30%, rgb(30 4 18 / 0.72) 100%), linear-gradient(180deg, rgb(30 4 18 / 0.35) 0%, transparent 22%, transparent 70%, rgb(30 4 18 / 0.5) 100%)',
              }}
            />
          </span>

          {/* The gold light that blooms behind the card as it lifts. */}
          <span
            aria-hidden="true"
            className={cn('absolute -inset-1/6 opacity-0', opening && 'animate-gate-glow')}
            style={{
              background:
                'radial-gradient(ellipse 36% 30% at 50% 58%, #fff6dd 0%, #ffe9a8 16%, rgb(232 195 106 / 0.5) 38%, transparent 64%)',
              filter: 'blur(14px)',
            }}
          />

          {/* On a phone the card fills the screen, as an app's splash screen
              does. From `md` up it stands as a phone-shaped card on the glow,
              as a full-width card would crop Shri Ganesh on a wide screen. */}
          <span
            className={cn(
              'absolute inset-0 md:flex md:items-center md:justify-center md:px-4 md:pb-36',
              top === undefined ? 'md:pt-6' : 'md:pt-20',
              opening && 'animate-gate-card-rise',
            )}
          >
            <span className="block size-full md:animate-card-bob md:flex md:items-center md:justify-center">
              <GaneshCover className="size-full md:rounded-input md:overflow-hidden md:aspect-5/9 md:h-full md:max-h-full md:w-auto md:max-w-full" />
            </span>
          </span>

          {/* The greeting, over the foot of the art, on a dark fade so it
              reads on the light card. */}
          <span
            className={cn(
              'from-plum-night/90 absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-linear-to-t to-transparent px-6 pt-24 pb-[max(2rem,env(safe-area-inset-bottom))] text-center',
              opening && 'animate-gate-hint-out',
            )}
          >
            <span className="font-script text-hero text-surface">{greeting}</span>
            {/* The gold ring blinks round the words, so a guest knows to tap. */}
            <span className="font-display text-surface border-haldi rounded-pill relative mt-2 border-2 px-5 py-2.5 font-semibold">
              <span
                aria-hidden="true"
                className="border-haldi rounded-pill animate-tap-ring pointer-events-none absolute -inset-2 border-2 motion-reduce:animate-none"
              />
              Please tap to open your invitation
            </span>
          </span>
        </button>
      )}
    </>
  );
}

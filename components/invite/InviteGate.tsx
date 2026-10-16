'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { SoundButton } from '@/components/invite/SoundButton';
import { cn } from '@/lib/utils';

/**
 * The opening of a couple's invite: the Shri Ganesh card stands over the
 * invite on a dark, blurred copy of itself, and greets the guest by name
 * ("Hi Kartheek"). A tap starts the couple's song, the dark cover dissolves,
 * and the card lifts up and off the screen with a soft gold light behind it.
 *
 * The invite is not hidden under the card, only covered, so it shows through
 * more and more as the cover fades. Nothing has to "appear" at the end, which
 * is a whole class of reveal bugs that cannot happen.
 *
 * The card art is 475 by 662. It is shown at its own size or smaller, never
 * stretched to fill the screen: a stretched card goes soft on a desktop and
 * loses its arch on a tall phone. The blurred backdrop fills the rest.
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
 */

/** How long the opening runs: the card's lift ends at 120 + 1400 ms. */
const OPENING_MS = 1500;

type Phase = 'closed' | 'opening' | 'open';

export interface InviteGateProps {
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  /** The couple's names, for the screen reader's label: `Riya & Arjun`. */
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

const CARD = { src: '/invite/ganesha-card.webp', width: 475, height: 662 };

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
    // Start the song inside the tap: it is the gesture that allows sound.
    audio.current?.play().catch(() => setPlaying(false));
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
        // The cover itself is transparent: the dark colour lives on the wash
        // below, so when the wash fades the invite shows through.
        <button
          type="button"
          onClick={open}
          disabled={opening}
          aria-label={`${greeting}. Please tap to open your invitation from ${couple}`}
          className="fixed inset-0 z-50 block overflow-hidden"
        >
          <span
            aria-hidden="true"
            className={cn('bg-plum-night absolute inset-0', opening && 'animate-gate-wash-out')}
          >
            {/* The same card art, blown up, blurred and dimmed, as the
                backdrop. Blurred, a 64px copy looks the same as a full one. */}
            <Image
              src={CARD.src}
              alt=""
              fill
              sizes="64px"
              priority
              className="scale-125 object-cover"
              style={{ filter: 'blur(46px) saturate(1.25) brightness(0.6)' }}
            />
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

          {/* On a phone the card art fills the screen, as an app's splash
              screen does; it is cropped at the sides only, so Shri Ganesh and
              the words under him stay in view. From `md` up it stands as a
              card on the blurred backdrop, as stretching it to a desktop
              screen would blur it and crop the arch. */}
          <span
            className={cn(
              'absolute inset-0 md:flex md:items-center md:justify-center md:px-4 md:pb-36',
              top === undefined ? 'md:pt-6' : 'md:pt-20',
              opening && 'animate-gate-card-rise',
            )}
          >
            <span className="block size-full md:animate-card-bob md:flex md:items-center md:justify-center">
              <Image
                src={CARD.src}
                alt=""
                width={CARD.width}
                height={CARD.height}
                priority
                // Served as is: the file is already small, and Next's
                // density srcset would halve its natural size, which the
                // auto width and height on a desktop would then show at half size.
                unoptimized
                draggable={false}
                className="md:rounded-input block size-full object-cover select-none md:h-auto md:max-h-full md:w-auto md:max-w-full md:object-contain"
              />
            </span>
          </span>

          {/* The greeting, over the foot of the art, on a dark fade so it
              reads on the light card. */}
          <span
            className={cn(
              'from-plum-night/90 absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-linear-to-t to-transparent px-6 pt-32 pb-[max(2rem,env(safe-area-inset-bottom))] text-center',
              opening && 'animate-gate-hint-out',
            )}
          >
            <span className="font-script text-hero text-surface">{greeting}</span>
            <span className="font-display text-heading text-surface">
              Please tap to open your invitation
            </span>
          </span>
        </button>
      )}
    </>
  );
}

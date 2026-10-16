'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A round play/pause button for one song. The audio loads only on the first
 * tap (`preload="none"`), so a list of songs costs nothing until a couple
 * listens. Only one button plays at a time: starting one pauses the other.
 * It never plays on its own.
 *
 * `'use client'` for the audio element and its state.
 */

export interface PlayButtonProps {
  /** Where the audio plays from. */
  src: string;
  /** The song's name, for the button's accessible name: "Play Kesariya". */
  title: string;
  /** Called when a tap starts this song: the sign-up card chooses it too. */
  onPlay?: () => void;
  className?: string;
}

/** The audio element playing now, across every PlayButton on the page. */
let playing: HTMLAudioElement | null = null;

type State = 'idle' | 'loading' | 'playing' | 'error';

export function PlayButton({ src, title, onPlay, className }: PlayButtonProps): React.JSX.Element {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>('idle');

  // Stop when the button leaves the page, such as a step change on the card.
  useEffect(() => {
    const element = audio.current;
    return () => {
      element?.pause();
      if (playing === element) playing = null;
    };
  }, []);

  function toggle(): void {
    const element = audio.current;
    if (element === null) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    if (playing !== null && playing !== element) playing.pause();
    playing = element;
    onPlay?.();
    setState('loading');
    element.play().catch(() => setState('error'));
  }

  const on = state === 'playing' || state === 'loading';

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${on ? 'Pause' : 'Play'} ${title}`}
        aria-pressed={on}
        className={cn(
          'squish rounded-pill inline-grid size-11 shrink-0 place-items-center border-2',
          // One set or the other: `cn` does not merge, so two background
          // classes would leave the stylesheet order to pick, and white on white.
          on ? 'bg-brand text-on-brand border-transparent' : 'border-line bg-surface text-ink',
          className,
        )}
      >
        {state === 'loading' ? (
          <span
            aria-hidden="true"
            className="border-sunken border-t-ink size-5 animate-spin rounded-full border-2"
          />
        ) : on ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
            <rect x="6" y="5" width="4" height="14" rx="1.5" />
            <rect x="14" y="5" width="4" height="14" rx="1.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-0.5 size-5 fill-current">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
      {state === 'error' && (
        <span className="sr-only" role="status">
          {title} could not play.
        </span>
      )}
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlaying={() => setState('playing')}
        onPause={() => setState('idle')}
        onEnded={() => setState('idle')}
        onError={() => setState('error')}
      />
    </>
  );
}

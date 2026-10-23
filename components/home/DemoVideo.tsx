'use client';

import { useEffect, useRef, useState } from 'react';
import { preconnect } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export interface DemoVideoProps {
  /** The uploaded video, or `null` to list `steps` in its place. */
  video: {
    /** A signed URL that plays at once. */
    src: string;
    /** A URL that signs a fresh one, for when `src` has expired. */
    fallbackSrc: string;
    /** The poster image URL. Empty for none. */
    poster: string;
  } | null;
  /** What the walkthrough shows. Listed while there is no video. */
  steps: readonly string[];
}

/** A play triangle in a circle, drawn in the button's text colour. */
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
      <circle cx="12" cy="12" r="11" className="fill-brand" />
      <path d="M10 8v8l6-4Z" className="fill-on-brand" />
    </svg>
  );
}

/** Start warming the video this far before the button scrolls into view. */
const WARM_MARGIN = '400px';

/**
 * Starts the video with sound. A browser can refuse sound; then it plays
 * muted, and the controls let the visitor unmute.
 */
function playWithFallback(video: HTMLVideoElement) {
  const attempt = video.play() as Promise<void> | undefined;
  attempt?.catch(() => {
    video.muted = true;
    video.play()?.catch(() => {
      // The visitor can still press play on the controls.
    });
  });
}

/**
 * "Watch a demo": a button that opens the walkthrough video in a dialog.
 *
 * Built to start at once on a phone. The page opens a connection to the
 * video's host early. When the button comes near the screen, the player
 * mounts, hidden in the closed dialog, with `preload="metadata"`: the browser
 * fetches the file's index (the video is uploaded "fast start", so the index
 * is at the front) and nothing more. The tap then plays the player that is
 * already there, inside the tap itself, so iOS Safari allows sound too.
 * Closing the dialog pauses it.
 *
 * Before the button nears the screen, the page loads no byte of video.
 */
export function DemoVideo({ video, steps }: DemoVideoProps) {
  const [open, setOpen] = useState(false);
  const [warm, setWarm] = useState(false);
  const [src, setSrc] = useState(video?.src ?? '');
  const anchor = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const playOnMount = useRef(false);

  // Resolve DNS and TLS for the video's host before anyone taps.
  if (video !== null && /^https:/.test(video.src)) preconnect(new URL(video.src).origin);

  useEffect(() => {
    if (video === null || warm) return;
    const element = anchor.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      setWarm(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setWarm(true);
      },
      { rootMargin: WARM_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [video, warm]);

  // A tap that came before the player mounted, or a fresh URL after an
  // expired one, plays as soon as the player has its source.
  useEffect(() => {
    if (warm && playOnMount.current && player.current !== null) {
      playOnMount.current = false;
      playWithFallback(player.current);
    }
  }, [warm, src]);

  function openDialog() {
    setOpen(true);
    const element = player.current;
    if (element === null) {
      playOnMount.current = video !== null;
      setWarm(video !== null);
      return;
    }
    element.preload = 'auto';
    if (element.ended) element.currentTime = 0;
    playWithFallback(element);
  }

  function closeDialog() {
    setOpen(false);
    player.current?.pause();
  }

  return (
    <div ref={anchor} className="flex flex-col">
      <Button
        variant="secondary"
        onClick={openDialog}
        className="self-start"
        data-track-cta="demo-video"
      >
        <PlayIcon />
        Watch a demo
      </Button>
      <Dialog open={open} onClose={closeDialog} title="From WhatsApp to your invite">
        {video !== null && warm && (
          <video
            ref={player}
            src={src}
            controls
            playsInline
            preload="metadata"
            {...(video.poster !== '' && { poster: video.poster })}
            onError={() => {
              // The signed URL may have expired on a page left open: sign a fresh one.
              if (src === video.fallbackSrc) return;
              playOnMount.current = open;
              setSrc(video.fallbackSrc);
            }}
            className="bg-sunken rounded-card mx-auto aspect-9/16 w-full max-w-72"
          >
            <p>Your browser cannot play this video.</p>
          </video>
        )}
        {video === null && (
          <>
            <p className="text-ink-soft">
              Our video walkthrough is on its way. This is what it shows, step by step.
            </p>
            <ol className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-brand-soft rounded-pill font-weighted flex size-7 shrink-0 items-center justify-center"
                  >
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Dialog>
    </div>
  );
}

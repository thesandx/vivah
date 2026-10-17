'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { DemoVideoSource } from '@/lib/demo-video';

export interface DemoVideoProps {
  /** The video files, WebM first. Empty shows `steps` in place of the video. */
  sources: readonly DemoVideoSource[];
  /** The first frame, as an image URL. Empty for none. */
  poster: string;
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

/**
 * Starts the video with sound. A browser can refuse sound when the play does
 * not come straight from a tap (iOS Safari does, because the video mounts
 * after the tap). Then it plays muted, and the controls let the guest unmute.
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
 * The page pays nothing for the video until the tap. Before it, no `<video>`
 * element exists, so the browser fetches no byte. The tap mounts the player,
 * which streams from the start and plays at once. Closing the dialog unmounts
 * it, which stops the sound and the download.
 */
export function DemoVideo({ sources, poster, steps }: DemoVideoProps) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = sources.length > 0;

  useEffect(() => {
    if (open && videoRef.current) playWithFallback(videoRef.current);
  }, [open]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="self-start">
        <PlayIcon />
        Watch a demo
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="From WhatsApp to your invite">
        {open && hasVideo && (
          <video
            ref={videoRef}
            controls
            playsInline
            preload="auto"
            {...(poster !== '' && { poster })}
            className="bg-sunken rounded-card mx-auto aspect-9/16 w-full max-w-72"
          >
            {sources.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
            <p>Your browser cannot play this video.</p>
          </video>
        )}
        {!hasVideo && (
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
    </>
  );
}

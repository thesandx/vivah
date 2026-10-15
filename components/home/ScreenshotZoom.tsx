'use client';

import { useState } from 'react';

import { Dialog } from '@/components/ui/Dialog';

export interface ScreenshotZoomProps {
  src: string;
  alt: string;
  /** Names the larger view, such as `From WhatsApp`. */
  title: string;
}

/**
 * A chat screenshot that opens larger on a tap, so a visitor can read the
 * whole chat. `'use client'` for the open state.
 */
export function ScreenshotZoom({ src, alt, title }: ScreenshotZoomProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/zoom relative block w-full cursor-zoom-in"
        aria-label={`Open the screenshot larger. ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route with a year-long cache; the admin page already shrank it */}
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="bg-sunken aspect-3/4 w-full object-cover object-top"
        />
        <span
          aria-hidden="true"
          className="bg-surface text-brand shadow-hard-sm absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full transition-transform group-hover/zoom:scale-110"
        >
          <svg viewBox="0 0 20 20" className="size-5 fill-none stroke-current" strokeWidth="2">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13 13 4 4M9 6.5v5M6.5 9h5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the same image as the card, already in the browser's cache */}
        <img src={src} alt={alt} className="rounded-box mx-auto max-h-120 w-auto" />
      </Dialog>
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface LiveInvitePhoneProps {
  /** The sample invite's address, with a guest's name: `https://priya-rahul.vivah.online/Neha`. */
  src: string;
  /** The bride's and the groom's first names, for the cover and the frame's title. */
  bride: string;
  groom: string;
}

/** The phone the invite is laid out for, in CSS pixels. The frame scales it down. */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

/** Start loading the invite this far before the phone scrolls into view. */
const LOAD_MARGIN = '300px';

/**
 * The sample invite, live, inside a phone on the home page. A visitor taps
 * the cover, scratches the date and scrolls the invite without leaving the
 * page, so they never go to another address and forget to come back.
 *
 * It must not slow the home page. The first paint is a cover drawn in CSS,
 * with no image and no request. The invite loads only after the visitor
 * acts: when they scroll and the phone is near the screen, or when they tap
 * the cover. A page load alone never fetches it, so a speed test never pays
 * for it, even on a desktop where the phone shows on the first screen. The
 * cover stays on top until the invite has loaded.
 *
 * The invite is laid out at a real phone's width (390 px), then scaled down
 * to fit the frame, so it looks as it does on a guest's phone. The sandbox
 * lets the invite run and open links in a new tab, but never move this page.
 *
 * `'use client'` for the visibility check, the scale and the load state.
 */
export function LiveInvitePhone({ src, bride, groom }: LiveInvitePhoneProps): React.JSX.Element {
  const screenRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen === null) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: LOAD_MARGIN },
    );
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(true);
    window.addEventListener('scroll', onScroll, { once: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen === null) return;
    const measure = () => setScale(screen.clientWidth / SCREEN_WIDTH);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  // An old browser without the observer loads the invite on the first scroll.
  const nearScreen = near || typeof IntersectionObserver === 'undefined';
  const opening = (nearScreen && scrolled) || tapped;

  return (
    <figure className="flex flex-col items-center gap-4">
      <div className="bg-ink rounded-sheet shadow-hard-lg relative w-72 p-2 sm:w-80">
        <div
          ref={screenRef}
          className="rounded-card bg-jewel-maroon relative aspect-390/844 overflow-hidden"
        >
          {opening && scale > 0 && (
            <iframe
              src={src}
              title={`A live sample wedding invite for ${bride} and ${groom}`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              onLoad={() => setLoaded(true)}
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                transform: `scale(${scale})`,
              }}
            />
          )}
          <button
            type="button"
            onClick={() => setTapped(true)}
            tabIndex={loaded ? -1 : 0}
            aria-hidden={loaded ? true : undefined}
            className={cn(
              'from-jewel-maroon to-jewel-maroon-deep text-jewel-light absolute inset-0 flex flex-col items-center justify-center gap-8 bg-linear-to-b transition-opacity duration-500',
              loaded ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
          >
            <span className="font-script text-title text-jewel-haldi">You’re invited</span>
            <span
              aria-hidden="true"
              className="bg-jewel-haldi text-jewel-cocoa font-weighted text-heading grid size-24 place-items-center rounded-full font-bold"
            >
              {bride.charAt(0)}
              {groom.charAt(0)}
            </span>
            <span className="text-small rounded-pill border-jewel-haldi border-2 px-4 py-1.5 tracking-widest uppercase">
              {opening ? 'Opening the invite' : 'Tap to open'}
            </span>
          </button>
          <span
            aria-hidden="true"
            className="bg-ink rounded-pill pointer-events-none absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2"
          />
        </div>
      </div>
      <figcaption className="text-small text-ink-soft max-w-xs text-center">
        Tap and scroll. This is a live sample for a made-up couple.
      </figcaption>
    </figure>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface AutoScrollerItem {
  /** A stable key for the item. */
  key: string;
  node: React.ReactNode;
}

export interface AutoScrollerProps {
  items: readonly AutoScrollerItem[];
  /** What the row holds, for screen readers, such as `Reviews from couples`. */
  label: string;
  /** How fast the row drifts, in pixels per second. */
  speed?: number;
  className?: string;
}

/** How long the row waits after a touch, a wheel or a button before it moves again. */
const RESUME_AFTER_MS = 2500;

/** How long the row rests at either end before it drifts back. */
const TURN_PAUSE_MS = 1500;

/** The longest step one frame may take, so a slow frame never jumps the row. */
const MAX_FRAME_MS = 50;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * A row of cards that drifts sideways by itself, to the last card and then
 * back to the first, and that a visitor can also swipe, drag with a
 * trackpad, or step through with the arrow buttons. No scrollbar shows.
 *
 * It is a real scrolling row, not a CSS animation, so the visitor's own
 * scroll and the drift move the same thing. It holds each card once and
 * never loops: a swipe stops at either end, and the drift turns round there.
 * An earlier version looped by holding the list twice and jumping back, and
 * a fast swipe on a phone ran past the jump into blank space.
 *
 * It stops while a pointer is on it, a card has focus, or a finger is on it,
 * and for a moment after a swipe, a wheel or a button. It also stops while it
 * is off screen or the tab is hidden. With reduced motion it never drifts.
 *
 * `'use client'` for the drift, which needs `requestAnimationFrame`.
 */
export function AutoScroller({
  items,
  label,
  speed = 28,
  className,
}: AutoScrollerProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);

  // Hover, focus and touch each hold the row still. `pausedUntil` covers the
  // moment after a swipe, a wheel or a button.
  const holds = useRef({ hover: false, focus: false, touch: false, pausedUntil: 0 });

  // Decide whether the row needs to drift: only when the list is wider than
  // the row. A short list stays still on the left.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;
    if (scroller === null || list === null) return;

    const measure = () => {
      const wider = list.getBoundingClientRect().width > scroller.clientWidth + 1;
      setOverflows(wider);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items]);

  // Load every image in the row once the row comes near the screen. A browser
  // lazy-loads an image only when it is near the viewport, and a card off to
  // the side of a scrolling row is not, so each card would arrive blank and
  // fill in a second later, after the swipe already showed it. Safari is the
  // worst at this.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return;

    const loadAll = () =>
      scroller
        .querySelectorAll<HTMLImageElement>('img[loading="lazy"]')
        .forEach((image) => image.setAttribute('loading', 'eager'));

    if (typeof IntersectionObserver === 'undefined') {
      loadAll();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting !== true) return;
        loadAll();
        observer.disconnect();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [items]);

  // The drift.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!overflows || scroller === null) return;

    let visible = true;
    // 1 drifts towards the last card, -1 back towards the first.
    let direction = 1;
    let frame = 0;
    let last = 0;
    // The position as a fraction of a pixel. Browsers round `scrollLeft`, so
    // adding a fraction to it each frame would never move.
    let position = scroller.scrollLeft;
    let written = scroller.scrollLeft;

    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
          });
    intersection?.observe(scroller);

    const tick = (now: number) => {
      const step = Math.min(now - (last || now), MAX_FRAME_MS);
      last = now;
      const held = holds.current;
      const still =
        held.hover ||
        held.focus ||
        held.touch ||
        now < held.pausedUntil ||
        !visible ||
        document.hidden ||
        prefersReducedMotion();

      // Someone else moved the row (a swipe, a key, a button): start from there.
      if (Math.abs(scroller.scrollLeft - written) > 1) position = scroller.scrollLeft;

      // Write only when the row drifts. A write while a finger is still
      // flicking the row would stop its momentum.
      if (!still) {
        const end = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        position += (direction * speed * step) / 1000;
        // Turn round only at the end the row is drifting towards.
        if ((direction === 1 && position >= end) || (direction === -1 && position <= 0)) {
          position = direction === 1 ? end : 0;
          direction = -direction;
          held.pausedUntil = now + TURN_PAUSE_MS;
        }
        scroller.scrollLeft = position;
        written = scroller.scrollLeft;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      intersection?.disconnect();
    };
  }, [overflows, speed]);

  const pauseForAMoment = () => {
    holds.current.pausedUntil = performance.now() + RESUME_AFTER_MS;
  };

  const step = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    const card = listRef.current?.firstElementChild;
    if (scroller === null || card === null || card === undefined) return;
    pauseForAMoment();
    scroller.scrollBy({ left: direction * card.getBoundingClientRect().width, behavior: 'smooth' });
  };

  return (
    <div
      className={cn('group relative', className)}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') holds.current.hover = true;
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') holds.current.hover = false;
      }}
      onFocus={() => {
        holds.current.focus = true;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) holds.current.focus = false;
      }}
    >
      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="scrollbar-none flex overflow-x-auto overscroll-x-contain py-4"
        onTouchStart={() => {
          holds.current.touch = true;
        }}
        onTouchEnd={() => {
          holds.current.touch = false;
          pauseForAMoment();
        }}
        onWheel={pauseForAMoment}
        onKeyDown={pauseForAMoment}
      >
        <div className="flex w-max px-5 sm:px-8">
          <ul ref={listRef} className="flex shrink-0 gap-5">
            {items.map((item) => (
              <li key={item.key} className="shrink-0">
                {item.node}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {overflows && (
        <div className="pointer-events-none absolute inset-x-2 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
          <ArrowButton direction={-1} onClick={() => step(-1)} />
          <ArrowButton direction={1} onClick={() => step(1)} />
        </div>
      )}
    </div>
  );
}

function ArrowButton({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 1 ? 'Next' : 'Previous'}
      className="bg-surface text-ink shadow-hard border-line squish pointer-events-auto flex size-11 items-center justify-center rounded-full border-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
        <path
          d={direction === 1 ? 'm8 4 6 6-6 6' : 'm12 4-6 6 6 6'}
          className="fill-none stroke-current"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

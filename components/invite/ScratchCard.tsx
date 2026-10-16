'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A scratch card: rose foil, thick with pink and gold glitter, over one part
 * of the wedding date. Under the foil is a jewel-toned card (`jewel-scratch`)
 * with the part's name and value. The guest rubs it away with a finger or the mouse, and
 * the glitter dust they rub off falls from under the finger and fades. Once
 * enough is gone, the rest of the foil sheds its dust and falls away by
 * itself. A keyboard user gets a "Reveal" button instead, so nobody is stuck
 * behind the foil.
 *
 * A Client Component for the canvases and the pointer. The value is in the
 * server HTML under the foil, so a screen reader and a search engine read the
 * date at once; the foil and the dust are decoration (`aria-hidden`).
 *
 * The dust is a second canvas, outside the card's rounded clip, so it can fall
 * past the card's bottom edge. It animates only while dust is in the air, and
 * not at all for a guest who asks the system for reduced motion.
 */

export interface ScratchCardProps {
  /** What is under the foil, e.g. `07` or `12`. */
  value: string;
  /** What the card is, e.g. `Day`. Printed over the value, and names the reveal button. */
  label: string;
  /** The card's face under the foil, e.g. `jewel-scratch-day`. */
  className?: string;
}

/** Reveal the rest once this share of the foil is gone. */
const ENOUGH = 0.45;
/** How wide a finger scratches, in CSS pixels. */
const BRUSH = 34;
/** Dust in the air at once, at most. Keeps a cheap phone smooth. */
const MAX_DUST = 220;
/** How far beside the card the dust can drift, in CSS pixels (`-inset-x-4`). */
const SIDE_ROOM = 16;

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  colour: string;
  /** Sparkle: the mote's brightness flickers at this rate. */
  twinkle: number;
}

/** A theme colour, read from the CSS token, so the foil follows the theme. */
function token(element: Element, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

/** The glitter's colours: blush, rose petal, rose, gold foil and white. */
function glitterColours(element: Element): string[] {
  return [
    token(element, '--color-brand-soft', 'pink'),
    token(element, '--color-peach', 'pink'),
    token(element, '--color-brand', 'brown'),
    token(element, '--color-butter', 'gold'),
    token(element, '--color-surface', 'white'),
  ];
}

/** A repeatable pseudo-random sequence, so every guest sees the same foil. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ScratchCard({ value, label, className }: ScratchCardProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dustCanvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const dust = useRef<Mote[]>([]);
  const frame = useRef<number | null>(null);
  const colours = useRef<string[]>([]);
  const dustColours = useRef<string[]>([]);

  // Paint the foil to the card's size, in device pixels so it stays sharp.
  useEffect(() => {
    const element = canvas.current;
    if (element === null) return;
    const context = element.getContext('2d');
    if (context === null) {
      setRevealed(true);
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = element.getBoundingClientRect();
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    context.scale(ratio, ratio);

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, token(element, '--color-peach', 'pink'));
    gradient.addColorStop(1, token(element, '--color-brand', 'brown'));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    // The glitter: many small flecks in the theme's pinks and gold, and a
    // few bright white glints, as on real glitter card stock.
    colours.current = glitterColours(element);
    // The dust uses the deeper pinks and the gold, which show on blush paper.
    dustColours.current = [
      token(element, '--color-brand', 'brown'),
      token(element, '--color-peach', 'pink'),
      token(element, '--color-butter', 'gold'),
      token(element, '--color-brand-deep', 'brown'),
    ];
    const random = seeded(Math.round(width * 7 + height));
    const flecks = Math.round((width * height) / 22);
    for (let index = 0; index < flecks; index += 1) {
      context.globalAlpha = 0.35 + random() * 0.55;
      context.fillStyle = colours.current[Math.floor(random() * colours.current.length)] ?? 'white';
      const size = 0.6 + random() * 1.6;
      context.fillRect(random() * width, random() * height, size, size);
    }
    context.fillStyle = token(element, '--color-surface', 'white');
    for (let index = 0; index < 14; index += 1) {
      const x = random() * width;
      const y = random() * height;
      const arm = 2 + random() * 3;
      context.globalAlpha = 0.7;
      context.fillRect(x - arm, y - 0.5, arm * 2, 1);
      context.fillRect(x - 0.5, y - arm, 1, arm * 2);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'destination-out';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = BRUSH;
  }, []);

  // Stop the dust animation when the card leaves the page.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** Draw the dust in the air, then drop the motes that have faded. */
  function animate(): void {
    const element = dustCanvas.current;
    const context = element?.getContext('2d') ?? null;
    if (element === null || context === null) {
      frame.current = null;
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, element.width, element.height);
    dust.current = dust.current.filter((mote) => mote.life > 0);
    for (const mote of dust.current) {
      mote.vy += 0.08; // gravity, gentle, as dust drifts
      mote.vx *= 0.985; // air
      mote.x += mote.vx;
      mote.y += mote.vy;
      mote.life -= 0.014;
      const glint = 0.6 + 0.4 * Math.sin(mote.life * mote.twinkle);
      context.globalAlpha = Math.max(0, Math.min(1, mote.life * 1.4)) * glint;
      context.fillStyle = mote.colour;
      context.fillRect(mote.x, mote.y, mote.size, mote.size);
    }
    context.globalAlpha = 1;
    frame.current = dust.current.length > 0 ? requestAnimationFrame(animate) : null;
  }

  /** Release `count` motes of glitter at a point on the card (card pixels). */
  function shed(x: number, y: number, count: number, spread: number): void {
    const element = dustCanvas.current;
    if (element === null || dustColours.current.length === 0 || prefersReducedMotion()) return;
    if (element.width === 0) {
      const ratio = window.devicePixelRatio || 1;
      const box = element.getBoundingClientRect();
      element.width = Math.round(box.width * ratio);
      element.height = Math.round(box.height * ratio);
    }
    for (let index = 0; index < count && dust.current.length < MAX_DUST; index += 1) {
      dust.current.push({
        x: SIDE_ROOM + x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -0.6 + Math.random() * 1.2,
        size: 1.5 + Math.random() * 2.5,
        life: 0.7 + Math.random() * 0.5,
        colour:
          dustColours.current[Math.floor(Math.random() * dustColours.current.length)] ?? 'pink',
        twinkle: 10 + Math.random() * 30,
      });
    }
    frame.current ??= requestAnimationFrame(animate);
  }

  function reveal(): void {
    setRevealed(true);
    // What is left of the foil sheds its glitter as it falls away.
    const element = canvas.current;
    if (element === null) return;
    const { width, height } = element.getBoundingClientRect();
    for (let index = 0; index < 8; index += 1) {
      shed(Math.random() * width, Math.random() * height * 0.8, 10, 24);
    }
  }

  /** The share of the foil already scratched away, sampled on a grid. */
  function cleared(element: HTMLCanvasElement): number {
    const context = element.getContext('2d');
    if (context === null) return 1;
    const { data } = context.getImageData(0, 0, element.width, element.height);
    const step = 4 * 24;
    let clear = 0;
    let total = 0;
    for (let index = 3; index < data.length; index += step) {
      total += 1;
      if ((data[index] ?? 0) === 0) clear += 1;
    }
    return total === 0 ? 1 : clear / total;
  }

  function scratch(event: React.PointerEvent<HTMLCanvasElement>): void {
    const element = canvas.current;
    if (element === null || revealed) return;
    if (event.pointerType === 'mouse' && event.buttons !== 1) {
      last.current = null;
      return;
    }
    const context = element.getContext('2d');
    if (context === null) return;
    const box = element.getBoundingClientRect();
    const point = { x: event.clientX - box.left, y: event.clientY - box.top };
    context.beginPath();
    const from = last.current ?? { x: point.x - 0.1, y: point.y };
    context.moveTo(from.x, from.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    // The farther the finger moved, the more glitter it rubbed off.
    const distance = Math.hypot(point.x - from.x, point.y - from.y);
    shed(point.x, point.y, Math.min(8, 2 + Math.round(distance / 4)), BRUSH * 0.7);
    last.current = point;
    moves.current += 1;
    if (moves.current % 6 === 0 && cleared(element) >= ENOUGH) reveal();
  }

  return (
    <div className="relative">
      <div className={cn('jewel-scratch', className)}>
        <span className="jewel-scratch-k">{label}</span>
        <span className="jewel-scratch-v lining-nums">{value}</span>
        <span aria-hidden="true" className="jewel-sheen" />
        <canvas
          ref={canvas}
          aria-hidden="true"
          onPointerDown={(event) => {
            last.current = null;
            event.currentTarget.setPointerCapture(event.pointerId);
            scratch(event);
          }}
          onPointerMove={scratch}
          onPointerUp={() => {
            last.current = null;
          }}
          className={cn(
            'absolute inset-0 size-full cursor-grab touch-none transition-opacity duration-700',
            revealed && 'pointer-events-none opacity-0',
          )}
        />
        {!revealed && (
          <button
            type="button"
            onClick={reveal}
            className="sr-only focus:not-sr-only focus:absolute focus:inset-x-2 focus:bottom-2"
          >
            Reveal the {label.toLowerCase()}
          </button>
        )}
      </div>
      {/* The falling dust, with room to fall below and drift beside the card
          (`-inset-x-4` matches SIDE_ROOM). A canvas does not stretch between
          insets as a box does, so a box holds the room and the canvas fills it. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 top-0 -bottom-16 z-10"
      >
        <canvas ref={dustCanvas} width={0} height={0} className="block size-full" />
      </span>
    </div>
  );
}

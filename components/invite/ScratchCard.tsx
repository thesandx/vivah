'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A scratch card: a rose foil over one part of the wedding date. The guest
 * rubs it away with a finger or the mouse, and once enough is gone the rest
 * falls away by itself. A keyboard user gets a "Reveal" button instead, so
 * nobody is stuck behind the foil.
 *
 * A Client Component for the canvas and the pointer. The value is in the
 * server HTML under the foil, so a screen reader and a search engine read the
 * date at once; the foil is decoration (`aria-hidden`).
 */

export interface ScratchCardProps {
  /** What is under the foil, e.g. `07` or `March`. */
  value: string;
  /** What the card is, e.g. `Day`. Names the reveal button. */
  label: string;
  className?: string;
}

/** Reveal the rest once this share of the foil is gone. */
const ENOUGH = 0.45;
/** How wide a finger scratches, in CSS pixels. */
const BRUSH = 34;

/** A theme colour, read from the CSS token, so the foil follows the theme. */
function token(element: Element, name: string, fallback: string): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

export function ScratchCard({ value, label, className }: ScratchCardProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);

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

    // A little sparkle, as on real scratch foil.
    context.fillStyle = token(element, '--color-surface', 'white');
    for (let index = 0; index < 18; index += 1) {
      const x = ((index * 37) % 100) / 100;
      const y = ((index * 61) % 100) / 100;
      context.globalAlpha = 0.25 + (index % 3) * 0.1;
      context.beginPath();
      context.arc(x * width, y * height, 1 + (index % 2), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.font = `600 ${Math.max(11, Math.round(width / 9))}px ${getComputedStyle(element).fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.letterSpacing = '3px';
    context.fillText('SCRATCH', width / 2, height / 2);
    context.globalCompositeOperation = 'destination-out';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = BRUSH;
  }, []);

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
    last.current = point;
    moves.current += 1;
    if (moves.current % 6 === 0 && cleared(element) >= ENOUGH) setRevealed(true);
  }

  return (
    <div
      className={cn(
        'bg-surface border-line rounded-card shadow-hard relative grid aspect-3/4 w-full place-items-center overflow-hidden border-2',
        className,
      )}
    >
      <span
        className={cn(
          'font-display text-brand px-1 text-center font-semibold lining-nums',
          value.length > 2 ? 'text-title' : 'text-key',
        )}
      >
        {value}
      </span>
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
          onClick={() => setRevealed(true)}
          className="sr-only focus:not-sr-only focus:absolute focus:inset-x-2 focus:bottom-2"
        >
          Reveal the {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

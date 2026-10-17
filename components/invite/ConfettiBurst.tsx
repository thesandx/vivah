'use client';

import { useEffect, useRef } from 'react';

/**
 * One burst of confetti, the moment the wedding date is revealed. Paper
 * pieces in the invite's jewel colours fly up and out from a point on the
 * screen, tumble as they fall, and fade. Then the canvas calls `onDone` so
 * its owner can remove it.
 *
 * A canvas, not DOM nodes: 150 pieces as elements would mean 150 layers on
 * a mid-range phone. The canvas animates only for the burst (about 3 s),
 * and the motion is scaled by the real time between frames, so a 120 Hz
 * screen does not play it twice as fast. A guest who asks the system for
 * reduced motion gets no burst at all.
 */

export interface ConfettiBurstProps {
  /** Where the burst starts, in viewport pixels: the middle of the date. */
  origin: { x: number; y: number };
  /** Called once the last piece has fallen or faded. */
  onDone: () => void;
}

/** How many pieces. Enough to feel generous, few enough for a cheap phone. */
const PIECES = 150;
/** How long the burst lasts, in ms, before the last pieces fade. */
const DURATION_MS = 3200;
/** Gravity and air drag, per 60 Hz frame. */
const GRAVITY = 0.22;
const DRAG = 0.985;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  /** The piece's spin in the screen's plane. */
  angle: number;
  spin: number;
  /** The tumble: the piece turns edge-on and back, so it flutters. */
  flip: number;
  flipSpeed: number;
  round: boolean;
  colour: string;
}

/** The `jewel-*` colours, read from the CSS tokens so they follow the spec. */
function jewelColours(element: Element): string[] {
  const style = getComputedStyle(element);
  const names = ['sindoor', 'rani', 'haldi', 'marigold', 'saffron', 'peacock', 'emerald', 'light'];
  const colours = names
    .map((name) => style.getPropertyValue(`--color-jewel-${name}`).trim())
    .filter((value) => value !== '');
  return colours.length > 0 ? colours : ['crimson', 'gold', 'orange', 'teal'];
}

function launch(origin: { x: number; y: number }, colours: string[]): Piece[] {
  const pieces: Piece[] = [];
  for (let index = 0; index < PIECES; index += 1) {
    // Upward, in a fan 140° wide, a few faster pieces flying highest.
    const direction = -Math.PI / 2 + (Math.random() - 0.5) * ((Math.PI * 7) / 9);
    const speed = 6 + Math.random() * 10;
    pieces.push({
      x: origin.x + (Math.random() - 0.5) * 40,
      y: origin.y + (Math.random() - 0.5) * 16,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      width: 5 + Math.random() * 5,
      height: 8 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.08 + Math.random() * 0.14,
      round: Math.random() < 0.25,
      colour: colours[Math.floor(Math.random() * colours.length)] ?? 'gold',
    });
  }
  return pieces;
}

export function ConfettiBurst({ origin, onDone }: ConfettiBurstProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The latest callback, so a new function from the parent does not restart
  // the burst.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d') ?? null;
    if (
      element === null ||
      context === null ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      done.current();
      return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const pieces = launch(origin, jewelColours(element));
    const start = performance.now();
    let previous = start;
    let frame = requestAnimationFrame(function draw(now: number) {
      // Frames since the last one, at 60 Hz. Capped, so a stalled tab does
      // not throw every piece off the screen at once.
      const step = Math.min((now - previous) / (1000 / 60), 3);
      previous = now;
      const elapsed = now - start;
      // The last third of the burst fades out.
      const fade = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / (DURATION_MS / 3)));
      context.clearRect(0, 0, width, height);
      let visible = 0;
      for (const piece of pieces) {
        piece.vx *= DRAG ** step;
        piece.vy = piece.vy * DRAG ** step + GRAVITY * step;
        piece.x += piece.vx * step;
        piece.y += piece.vy * step;
        piece.angle += piece.spin * step;
        piece.flip += piece.flipSpeed * step;
        if (piece.y > height + 20) continue;
        visible += 1;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        // Turning edge-on: the piece narrows to nothing and widens again.
        context.scale(1, Math.cos(piece.flip));
        context.globalAlpha = fade;
        context.fillStyle = piece.colour;
        if (piece.round) {
          context.beginPath();
          context.arc(0, 0, piece.width / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        }
        context.restore();
      }
      if (visible === 0 || elapsed >= DURATION_MS) {
        context.clearRect(0, 0, width, height);
        done.current();
        return;
      }
      frame = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(frame);
    // The burst plays once, from where it started.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `origin` is read once at launch
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className="jewel-confetti" />;
}

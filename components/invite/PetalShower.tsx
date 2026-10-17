/**
 * A gentle shower of marigold and rose petals over the invite, as guests
 * throw them over the couple at the varmala. A few petals at a time drift
 * down the 430px column, each swaying and turning over as it falls.
 *
 * A Server Component with no script: each petal is CSS keyframes on
 * `transform` only, which the browser runs off the main thread, so a
 * mid-range phone stays smooth and scrolling is untouched. The petals sit
 * under the opening card and the preview's banner (`z-30`), never take a
 * tap (`pointer-events: none`), and are hidden for a guest who asks the
 * system for reduced motion (`jewel-petals` in `styles/globals.css`).
 *
 * The petals are fixed, not random, so the server and the browser render the
 * same HTML and every guest sees the same shower. The negative delays put
 * petals mid-fall on the first frame, so the shower does not start empty.
 */

/** A marigold petal: narrow at the base, a frilled edge at the top. */
const MARIGOLD = 'M10 30C5 24 2 16 3 9C4 5 6 3 8 4C9 2 11 2 12 4C14 3 16 5 17 9C18 16 15 24 10 30Z';
/** A rose petal: a soft, wide cup. */
const ROSE = 'M10 30C3 26 0 17 2 10C4 3 9 1 10 4C11 1 16 3 18 10C20 17 17 26 10 30Z';

interface Petal {
  /** Across the column, in per cent. */
  left: number;
  /** Width in CSS pixels. The height follows the shape. */
  size: number;
  /** Seconds for one fall from top to bottom. */
  fall: number;
  /** Seconds into the fall at first paint. */
  delay: number;
  /** Seconds for one sway, side to side and back. */
  sway: number;
  shape: 'marigold' | 'rose';
  /** The `jewel-*` colour token. */
  colour: 'marigold' | 'saffron' | 'haldi' | 'rani' | 'sindoor';
}

const PETALS: readonly Petal[] = [
  { left: 6, size: 13, fall: 15, delay: 2, sway: 3.2, shape: 'marigold', colour: 'marigold' },
  { left: 18, size: 11, fall: 18, delay: 9, sway: 4.1, shape: 'rose', colour: 'rani' },
  { left: 29, size: 14, fall: 13, delay: 5, sway: 3.6, shape: 'marigold', colour: 'saffron' },
  { left: 41, size: 10, fall: 17, delay: 12, sway: 2.9, shape: 'rose', colour: 'sindoor' },
  { left: 52, size: 12, fall: 14, delay: 1, sway: 3.9, shape: 'marigold', colour: 'haldi' },
  { left: 63, size: 13, fall: 19, delay: 7, sway: 4.4, shape: 'rose', colour: 'rani' },
  { left: 74, size: 11, fall: 16, delay: 14, sway: 3.3, shape: 'marigold', colour: 'marigold' },
  { left: 86, size: 14, fall: 13.5, delay: 4, sway: 3.8, shape: 'rose', colour: 'rani' },
  { left: 94, size: 10, fall: 17.5, delay: 10, sway: 3, shape: 'marigold', colour: 'saffron' },
  { left: 35, size: 9, fall: 20, delay: 16, sway: 4.6, shape: 'marigold', colour: 'haldi' },
  { left: 68, size: 10, fall: 15.5, delay: 11.5, sway: 3.4, shape: 'rose', colour: 'sindoor' },
  { left: 12, size: 12, fall: 19.5, delay: 6.5, sway: 4.2, shape: 'rose', colour: 'rani' },
];

/**
 * Whole class names, so Tailwind sees each one and keeps its colour token.
 * A token no class names is dropped from the CSS, and the petal turns black.
 */
const FILL: Record<Petal['colour'], string> = {
  marigold: 'fill-jewel-marigold',
  saffron: 'fill-jewel-saffron',
  haldi: 'fill-jewel-haldi',
  rani: 'fill-jewel-rani',
  sindoor: 'fill-jewel-sindoor',
};

export function PetalShower(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="jewel-petals">
      {PETALS.map((petal) => (
        <span
          key={`${petal.left}-${petal.delay}`}
          className="jewel-petal"
          style={{
            left: `${petal.left}%`,
            width: petal.size,
            animationDuration: `${petal.fall}s`,
            animationDelay: `-${petal.delay}s`,
          }}
        >
          <svg
            viewBox="0 0 20 32"
            className="jewel-petal-sway"
            style={{ animationDuration: `${petal.sway}s` }}
          >
            <path d={petal.shape === 'marigold' ? MARIGOLD : ROSE} className={FILL[petal.colour]} />
            {/* The vein down the middle, so the petal reads as a petal. */}
            <path
              d="M10 28V8"
              stroke="var(--color-jewel-light)"
              strokeOpacity="0.45"
              strokeWidth="0.9"
              fill="none"
            />
          </svg>
        </span>
      ))}
    </span>
  );
}

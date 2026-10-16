import { GANESHA_PATH, GANESHA_VIEWBOX } from '@/components/invite/ganesha-path';
import { cn } from '@/lib/utils';

/**
 * The Shri Ganesh card that opens a couple's invite, drawn in code: a rani-pink
 * band with marigold flowers and white rangoli, a gold scalloped arch, a cream
 * lattice inside it, Shri Ganesh, "श्री गणेशाय नमः" as live text, and a lotus
 * at the foot. It copies the product owner's printed card art.
 *
 * Drawn, not a photo, so it is sharp on every screen, as bright as the theme
 * colours, and in the page's first bytes: nothing to download but one font
 * for the shloka. Shri Ganesh is a vector path traced from the original art.
 *
 * The view box is 400 by 720, the shape of a phone screen under the browser's
 * bars. The SVG fills its box and is cropped, never stretched (`slice`): a
 * taller phone loses a little at the sides, a shorter one a little at the top
 * and the foot. Nothing that matters sits near an edge, and the shloka sits
 * above the greeting that `InviteGate` lays over the foot. Decoration (`aria-hidden`): `InviteGate` names
 * the card for a screen reader.
 */

export interface GaneshCoverProps {
  className?: string;
}

const W = 400;
const H = 720;
/** The arch: the centre of its round top, and the radius of the gold band. */
const CX = 200;
const CY = 310;
const R = 165;

/** The arch's outline at radius `r`: up the left side, over the top, down the right. */
function archPath(r: number): string {
  return `M${CX - r} ${H + 20}V${CY}A${r} ${r} 0 0 1 ${CX + r} ${CY}V${H + 20}`;
}

/** Points along the arch at radius `r`, `step` apart, in the same order as `archPath`. */
function archPoints(r: number, step: number): Array<[number, number]> {
  const side = H - CY;
  const top = Math.PI * r;
  const total = side * 2 + top;
  const points: Array<[number, number]> = [];
  for (let along = 0; along <= total; along += step) {
    if (along < side) points.push([CX - r, H - along]);
    else if (along < side + top) {
      const angle = Math.PI - (along - side) / r;
      points.push([CX + r * Math.cos(angle), CY - r * Math.sin(angle)]);
    } else points.push([CX + r, CY + (along - side - top)]);
  }
  return points;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/** The gold band's chain of loops: small rings, overlapping, all round the arch. */
const LOOPS = archPoints(R, 9);

/** Eight petals round a centre, as on a rangoli or a marigold. */
function petals(petal: string, count = 8): React.JSX.Element[] {
  return Array.from({ length: count }, (_, index) => (
    <path key={index} d={petal} transform={`rotate(${(360 / count) * index})`} />
  ));
}

const RANGOLI_PETAL = 'M0 -6C5 -11 4.5 -19 0 -24C-4.5 -19 -5 -11 0 -6Z';
const MARIGOLD_PETAL = 'M0 -9C15 -20 13 -40 0 -50C-13 -40 -15 -20 0 -9Z';
const LATTICE_PETAL = 'M0 -3C3 -6 3 -11 0 -13C-3 -11 -3 -6 0 -3Z';
const LOTUS_PETAL = 'M0 0C34 -42 30 -100 0 -132C-30 -100 -34 -42 0 0Z';

function Rangoli({ x, y }: { x: number; y: number }): React.JSX.Element {
  return (
    <g transform={`translate(${x} ${y})`} fill="var(--color-arch)">
      {petals(RANGOLI_PETAL)}
      <circle r="3" />
      {[45, 135, 225, 315].map((angle) => (
        <circle key={angle} r="1.8" transform={`rotate(${angle}) translate(0 -29)`} />
      ))}
    </g>
  );
}

function Marigold({ x, y }: { x: number; y: number }): React.JSX.Element {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill="var(--color-marigold)">{petals(MARIGOLD_PETAL)}</g>
      <circle r="9" fill="var(--color-haldi)" />
    </g>
  );
}

export function GaneshCover({ className }: GaneshCoverProps): React.JSX.Element {
  const ganeshScale = 1;
  const ganeshX = (W - GANESHA_VIEWBOX.width * ganeshScale) / 2;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block select-none', className)}
    >
      <defs>
        <linearGradient id="ganesh-cover-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-rani)" />
          <stop offset="1" stopColor="var(--color-rani-deep)" />
        </linearGradient>
        <pattern
          id="ganesh-cover-lattice"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
          x={CX - 28}
          y="0"
        >
          <g fill="none" stroke="var(--color-lattice)" strokeWidth="1.2">
            <path d="M0 28L28 0L56 28L28 56Z" />
            {[
              [28, 28],
              [0, 0],
              [56, 0],
              [0, 56],
              [56, 56],
            ].map(([x, y]) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                {petals(LATTICE_PETAL)}
                <circle r="1.6" />
              </g>
            ))}
          </g>
        </pattern>
        <clipPath id="ganesh-cover-arch">
          <path d={`${archPath(R - 11)}Z`} />
        </clipPath>
      </defs>

      {/* The rani-pink band and its ornaments. */}
      <rect width={W} height={H} fill="url(#ganesh-cover-band)" />
      <Marigold x={18} y={150} />
      <Marigold x={W - 18} y={150} />
      <Rangoli x={70} y={88} />
      <Rangoli x={W - 70} y={88} />
      <g fill="var(--color-marigold)">
        <circle cx="118" cy="92" r="5" />
        <circle cx={W - 118} cy="92" r="5" />
        <path d="M120 34H280" stroke="var(--color-marigold)" strokeWidth="2.5" />
        <circle cx="120" cy="34" r="4" />
        <circle cx="280" cy="34" r="4" />
        <path d="M200 22C210 28 216 32 226 34C216 36 210 40 200 46C190 40 184 36 174 34C184 32 190 28 200 22Z" />
        <path d="M160 34C165 29 170 29 174 34C170 39 165 39 160 34ZM240 34C235 29 230 29 226 34C230 39 235 39 240 34Z" />
      </g>
      <g fill="var(--color-arch)">
        <circle cx="140" cy="92" r="3.5" />
        <circle cx={W - 140} cy="92" r="3.5" />
        <circle cx="200" cy="34" r="3.5" />
      </g>

      {/* The gold scalloped arch. */}
      <g fill="none">
        <path d={archPath(R + 12)} stroke="var(--color-marigold)" strokeWidth="4" />
        <path d={archPath(R)} stroke="var(--color-haldi)" strokeWidth="20" />
        <path d={archPath(R - 10)} stroke="var(--color-marigold)" strokeWidth="2.5" />
      </g>
      <g fill="none" stroke="var(--color-marigold)" strokeWidth="1.6">
        {LOOPS.map(([x, y]) => (
          <circle key={`${round(x)}-${round(y)}`} cx={round(x)} cy={round(y)} r="5.5" />
        ))}
      </g>

      {/* The cream inside the arch, with its faint lattice. */}
      <g clipPath="url(#ganesh-cover-arch)">
        <rect width={W} height={H} fill="var(--color-arch)" />
        <rect width={W} height={H} fill="url(#ganesh-cover-lattice)" />
      </g>

      {/* Shri Ganesh. */}
      <path
        d={GANESHA_PATH}
        fill="var(--color-ganesh)"
        fillRule="evenodd"
        transform={`translate(${round(ganeshX)} 178) scale(${ganeshScale})`}
      />
      <text
        x={CX}
        y="532"
        textAnchor="middle"
        fill="var(--color-ganesh)"
        fontSize="38"
        fontWeight="700"
        className="font-weighted"
      >
        श्री गणेशाय नमः
      </text>

      {/* The lotus at the foot, rising from the bottom edge. */}
      <g
        transform={`translate(${CX} ${H + 12}) scale(0.82)`}
        fill="var(--color-arch)"
        stroke="var(--color-ganesh)"
        strokeLinejoin="round"
      >
        {[-72, -48, 48, 72, -24, 24, 0].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d={LOTUS_PETAL} strokeWidth="2.5" />
            <path d={LOTUS_PETAL} strokeWidth="1.4" transform="translate(0 -14) scale(0.72)" />
            <path d="M0 -26V-104" strokeWidth="1.2" fill="none" />
          </g>
        ))}
        <circle r="30" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

import { cn } from '@/lib/utils';

/**
 * A faint, tiled watermark over the whole screen of the couple's unpaid
 * preview: "vivah.online · preview", in diagonal rows. A Server Component.
 *
 * A web page cannot stop a phone or desktop screenshot, or a screen
 * recording: the operating system takes them and tells the page nothing. So
 * the watermark is drawn into every frame instead. It is `fixed` over the
 * viewport, above the opening card, the invite and the banner, so whatever
 * is on the screen at the moment of a capture carries it.
 *
 * It is light on purpose: white letters with a thin dark edge, at a low
 * opacity, so they read on the dark cover and on the ivory page alike and
 * the couple still sees their invite. It never takes a tap
 * (`pointer-events: none`), so the card, the scratch, the song and the
 * banner work through it. Only the gold "Preview" notch sits above it.
 *
 * The paid invite never renders this. The page decides.
 */

export interface PreviewWatermarkProps {
  /** The words in each tile, e.g. `vivah.online · preview`. */
  label: string;
  className?: string;
}

/** One tile of the pattern, in CSS pixels. The text repeats every tile. */
const TILE_WIDTH = 280;
const TILE_HEIGHT = 120;

export function PreviewWatermark({ label, className }: PreviewWatermarkProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-testid="preview-watermark"
      className={cn('pointer-events-none fixed inset-0 size-full select-none', className)}
      // Above the opening card (z-50), under the preview notch (60). There is
      // no z-index token above 50.
      style={{ zIndex: 55 }}
    >
      <defs>
        <pattern
          id="preview-watermark-tile"
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-24)"
        >
          {/* Two rows per tile, the second offset by half, so the words do
              not stack into columns. The second row is drawn twice, a tile
              apart, so the words it carries past the tile's right edge
              continue at the left edge and none is cut off. */}
          {[
            { x: 0, y: 34 },
            { x: TILE_WIDTH / 2, y: 94 },
            { x: -TILE_WIDTH / 2, y: 94 },
          ].map(({ x, y }) => (
            <text
              key={`${x},${y}`}
              x={x}
              y={y}
              fill="white"
              fillOpacity={0.16}
              stroke="black"
              strokeOpacity={0.07}
              strokeWidth={0.6}
              fontFamily="system-ui, sans-serif"
              fontSize={13}
              fontWeight={600}
              letterSpacing={2}
            >
              {label}
            </text>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#preview-watermark-tile)" />
    </svg>
  );
}

/**
 * The Shubh Vivah colours as plain values, for the one place that cannot read
 * CSS tokens: the link preview image (`app/api/og/[slug]/route.tsx`), which is
 * drawn on the server without a stylesheet. Keep each value equal to its
 * token in `styles/globals.css`, `[data-theme='shubh-vivah']`.
 */
export const INVITE_PALETTE = {
  /** `--color-paper`: ivory card stock. */
  paper: '#fbf3e4',
  /** `--color-ink`: deep maroon. */
  ink: '#5a1020',
  /** `--color-brand`: maroon. */
  brand: '#8e1b2c',
  /** `--color-brand-soft`: marigold. */
  marigold: '#f2c46d',
  /** `--color-butter`: antique gold. */
  gold: '#c99a3b',
  /** `--color-peach`: marigold orange. */
  orange: '#e8782a',
} as const;

/**
 * Whether the preview image can draw a name. Its fonts carry Latin letters
 * only; a name in another script (Devanagari, Tamil) would draw as empty
 * boxes, so the image leaves the greeting out. The page and the description
 * still greet the guest by name.
 */
export function drawableInLatinFonts(text: string): boolean {
  return /^[\p{Script=Latin}\p{M} .'&]*$/u.test(text);
}

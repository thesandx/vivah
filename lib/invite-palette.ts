/**
 * The invite colours as plain values, for the one place that cannot read CSS
 * tokens: the link preview image (`app/api/og/[slug]/route.tsx`), which is
 * drawn on the server without a stylesheet. Keep each value equal to its
 * token in `styles/globals.css`, `[data-theme='shubh-vivah']`.
 */
export const INVITE_PALETTE = {
  /** `--color-paper`: blush card stock. */
  paper: '#fdf6f4',
  /** `--color-ink`: dusty plum-rose. */
  ink: '#6e3b45',
  /** `--color-brand`: rose. */
  brand: '#a84d62',
  /** `--color-brand-soft`: blush. */
  blush: '#f7d6dd',
  /** `--color-butter`: gold foil. */
  gold: '#e6c477',
  /** `--color-peach`: rose petal. */
  petal: '#f2b6c1',
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

import localFont from 'next/font/local';

import { cn } from '@/lib/utils';

/**
 * Applies the Shubh Vivah theme to what it wraps: ivory, maroon and gold,
 * with the names in a script face. A Server Component.
 *
 * The theme re-assigns the colour and font tokens (`styles/globals.css`,
 * `[data-theme='shubh-vivah']`), so the invite uses the same utilities as the
 * product site and the lint rules still apply. The fonts load only where this
 * wraps something: the couple's site and the couple's preview, not the
 * product site. See design-language.md, "The invite theme".
 */

/** Cormorant Garamond: the serif for headings and text. OFL, self-hosted. */
const cormorant = localFont({
  src: [
    { path: '../../public/fonts/cormorantgaramond-500.woff2', weight: '500' },
    { path: '../../public/fonts/cormorantgaramond-600.woff2', weight: '600' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
});

/** Great Vibes: the script for the couple's names and the greeting. OFL. */
const greatVibes = localFont({
  src: '../../public/fonts/greatvibes-400.woff2',
  weight: '400',
  variable: '--font-great-vibes',
  display: 'swap',
});

export interface InviteThemeProps {
  children: React.ReactNode;
  className?: string;
}

export function InviteTheme({ children, className }: InviteThemeProps) {
  return (
    <div
      data-theme="shubh-vivah"
      className={cn(cormorant.variable, greatVibes.variable, 'text-ink font-display', className)}
    >
      {children}
    </div>
  );
}

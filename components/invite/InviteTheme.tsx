import { cn } from '@/lib/utils';

/**
 * Applies the Shubh Vivah theme to what it wraps: ivory, maroon and gold,
 * with the names in a script face. A Server Component.
 *
 * The theme re-assigns the colour and font tokens (`styles/globals.css`,
 * `[data-theme='shubh-vivah']`), so the invite uses the same utilities as the
 * product site and the lint rules still apply. The fonts load once, in
 * `app/layout.tsx`. See design-language.md, "The invite theme".
 */

export interface InviteThemeProps {
  children: React.ReactNode;
  className?: string;
}

export function InviteTheme({ children, className }: InviteThemeProps) {
  return (
    <div data-theme="shubh-vivah" className={cn('text-ink font-display', className)}>
      {children}
    </div>
  );
}

import { cn } from '@/lib/utils';

import { BackButton, type BackButtonProps } from './BackButton';

export interface AppBarProps {
  /** The screen's name. It is the page's `h1`. */
  title: string;
  /** Show the back arrow. Pass its options, or `true` for the defaults. Omit on a top-level tab. */
  back?: true | BackButtonProps;
  /** A slot on the right: one action, such as "Save". */
  end?: React.ReactNode;
  className?: string;
}

/**
 * The top of an app screen: back arrow, title, one optional action. It
 * scrolls with the page as its heading. The sticky `SiteHeader` above it is
 * the only chrome that stays in view, so two bars never stack on a phone.
 *
 * From `md` up the bar loses its outline and lines up with the page frame.
 *
 * A Server Component; only the back arrow ships as JavaScript.
 */
export function AppBar({ title, back, end, className }: AppBarProps) {
  return (
    <div className={cn('bg-paper border-line border-b-2 md:border-b-0', className)}>
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center gap-3 px-4 py-2 sm:px-8 md:pt-10">
        {back !== undefined && <BackButton {...(back === true ? {} : back)} />}
        {/* py-1: `truncate` clips to the line box, and the display face's
            descenders ("g", "p") fall below `text-title`'s tight line-height. */}
        <h1 className="text-heading md:text-title min-w-0 flex-1 truncate py-1">{title}</h1>
        {end !== undefined && <div className="shrink-0">{end}</div>}
      </div>
    </div>
  );
}

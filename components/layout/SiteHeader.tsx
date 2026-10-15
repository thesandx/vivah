'use client';

import { usePathname } from 'next/navigation';

import { activeTabHref, APP_TABS } from '@/lib/navigation';
import { cn } from '@/lib/utils';

import { Header } from './Header';

export interface SiteHeaderProps {
  /** The product name, beside the brand mark. */
  appName: string;
  className?: string;
}

/**
 * The product site's navigation: a sticky header on every screen, with the
 * destinations in `APP_TABS`. On a phone the links fold into a hamburger
 * menu (`MobileMenu`); from `md` up they sit inline.
 *
 * A client component only to read the path, so the current link is marked.
 * See design-language.md > Responsive: an app on a phone, a website on a desktop.
 */
export function SiteHeader({ appName, className }: SiteHeaderProps) {
  const pathname = usePathname();
  const current = activeTabHref(pathname);

  return (
    <div className={cn('bg-paper border-line sticky top-0 z-30 border-b-2', className)}>
      <Header
        appName={appName}
        links={APP_TABS}
        {...(current !== undefined ? { currentPath: current } : {})}
      />
    </div>
  );
}

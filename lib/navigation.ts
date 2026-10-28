/**
 * The app's top-level destinations. `SiteHeader` draws them: inline from `md`
 * up, and in the hamburger menu on a phone.
 * See design-language.md > Responsive.
 *
 * Keep it to three to five. A destination here is a place the user goes back
 * to often, not every page in the app. Pages below a tab use `AppBar` with a
 * back arrow instead.
 */

export interface AppTab {
  href: string;
  label: string;
}

export const APP_TABS: readonly AppTab[] = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/dashboard', label: 'My site' },
  { href: '/help', label: 'Help' },
];

/** True when `pathname` is the tab's page or a page below it. */
export function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === '/') return pathname === '/';
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

/** The `href` of the destination that `pathname` sits under, if any. */
export function activeTabHref(pathname: string): string | undefined {
  return APP_TABS.find((tab) => isTabActive(tab.href, pathname))?.href;
}

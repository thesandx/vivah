import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TabBar } from '@/components/layout/TabBar';
import { env } from '@/lib/env';

/**
 * The product site's shell. A Server Component.
 *
 * It holds the two postures. A phone gets an app: the `TabBar` at the bottom.
 * From `md` up the same destinations move to the `SiteHeader` at the top, and
 * the page reads as a website. Both are CSS breakpoints, so the server sends
 * one HTML for every screen and nothing guesses the device.
 * See design-language.md > Responsive: an app on a phone, a website on a desktop.
 *
 * A couple's invite does not use this shell. See `app/(invite)/layout.tsx`.
 */
export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // pb-28 keeps the last line of every page clear of the floating TabBar, on
    // a phone only: from md up the TabBar hides. SiteHeader and TabBar are
    // client components rendered from this Server Component.
    <div className="flex flex-1 flex-col pb-28 md:pb-0">
      <SiteHeader appName={env.appName} />
      {children}
      <Footer
        owner={env.appName}
        links={[
          { href: '/design', label: 'Components' },
          { href: '/api/health', label: 'Health' },
        ]}
      />
      <TabBar />
    </div>
  );
}

import { SiteHeader } from '@/components/layout/SiteHeader';
import { env } from '@/lib/env';

/**
 * The admin surface, `/admin`. A Server Component.
 *
 * The product `SiteHeader` is at the top, so the brand mark leads back to the
 * home page from every admin screen, signed in or not. Nothing on the public
 * site links here: the header links out, never in. There is no footer and no
 * WhatsApp button. The product site's shell is `app/(main)/layout.tsx`. See
 * ADR-0008.
 */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader appName={env.appName} />
      {children}
    </div>
  );
}

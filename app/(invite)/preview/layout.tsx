import { SiteHeader } from '@/components/layout/SiteHeader';
import { env } from '@/lib/env';

/**
 * The private preview, `/preview/<id>`. A Server Component.
 *
 * Only the couple sees a preview, so it carries the product `SiteHeader`: the
 * brand mark leads back to the home page. A guest never sees this page. The
 * couple's published invite keeps no product header (`app/(invite)/layout.tsx`).
 */
export default function PreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader appName={env.appName} />
      {children}
    </div>
  );
}

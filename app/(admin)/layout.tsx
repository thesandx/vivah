/**
 * The admin surface, `/admin`. A Server Component.
 *
 * No product header, footer or WhatsApp button: nothing on the public site
 * links here, and nothing here links back into the site's navigation. The
 * product site's shell is `app/(main)/layout.tsx`. See ADR-0008.
 */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}

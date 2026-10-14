/**
 * The invite surface: a couple's invite and the private preview. A Server
 * Component.
 *
 * No product header, tab bar or footer. A guest who opens an invite from
 * WhatsApp sees the couple's page and nothing that asks them to sign in or
 * look around. The product site's shell is `app/(main)/layout.tsx`.
 */
export default function InviteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}

/**
 * The private preview, `/preview/<id>`. A Server Component.
 *
 * The couple sees their invite exactly as a guest will: the whole screen, in
 * the invite theme, with no product header. The page adds only a "Preview"
 * notch at the top and a banner at the foot. When a preview cannot be shown,
 * the page draws the product `SiteHeader` itself, so the brand mark leads
 * home.
 */
export default function PreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}

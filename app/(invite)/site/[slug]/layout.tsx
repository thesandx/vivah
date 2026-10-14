import { InviteTheme } from '@/components/invite/InviteTheme';

/**
 * Every couple's invite wears the Shubh Vivah theme, over the whole page. A
 * Server Component.
 */
export default function CoupleSiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <InviteTheme className="bg-paper text-body flex flex-1 flex-col">{children}</InviteTheme>;
}

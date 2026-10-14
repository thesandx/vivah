import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TabBar } from '@/components/layout/TabBar';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { env } from '@/lib/env';

/**
 * The footer: the guides first, then help and the policy pages the consumer
 * rules and the payment provider ask for. See the PRD, "Legal and policies".
 */
const FOOTER_LINKS = [
  { href: '/whatsapp-wedding-invitation', label: 'WhatsApp invitation' },
  { href: '/guides/wedding-invitation-message-whatsapp', label: 'Invitation messages' },
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds and cancellation' },
  { href: '/delivery-policy', label: 'Delivery' },
] as const;

/**
 * The product site's shell. A Server Component.
 *
 * It holds the two postures. A phone gets an app: the `TabBar` at the bottom.
 * From `md` up the same destinations move to the `SiteHeader` at the top, and
 * the page reads as a website. Both are CSS breakpoints, so the server sends
 * one HTML for every screen and nothing guesses the device.
 * See design-language.md > Responsive: an app on a phone, a website on a desktop.
 *
 * The WhatsApp button floats on every page here, so help is one tap away.
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
      <Footer owner={env.appName} links={FOOTER_LINKS} />
      <WhatsAppButton />
      <TabBar />
    </div>
  );
}

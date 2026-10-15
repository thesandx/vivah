import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { BUSINESS } from '@/lib/business';
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
 * The `SiteHeader` is at the top on every screen. On a phone its links fold
 * into a hamburger menu (`MobileMenu`); from `md` up they sit inline. The
 * switch is a CSS breakpoint, so the server sends one HTML for every screen.
 * See design-language.md > Responsive.
 *
 * The WhatsApp button floats on every page here, so help is one tap away.
 *
 * A couple's invite does not use this shell. See `app/(invite)/layout.tsx`.
 */
export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // pb-24 keeps the last line of every page clear of the floating WhatsApp
    // button on a phone. SiteHeader is a client component rendered from this
    // Server Component.
    <div className="flex flex-1 flex-col pb-24 md:pb-0">
      <SiteHeader appName={env.appName} />
      {children}
      <Footer owner={env.appName} contact={{ email: BUSINESS.email }} links={FOOTER_LINKS} />
      <WhatsAppButton />
    </div>
  );
}

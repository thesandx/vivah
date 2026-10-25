import { GoogleAds } from '@/components/ads/GoogleAdsProvider';
import { MetaPixel } from '@/components/ads/MetaPixel';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SocialLinks } from '@/components/layout/SocialLinks';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { BUSINESS, SOCIAL, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { env } from '@/lib/env';

/**
 * The footer: the pages the consumer rules and the payment provider ask for,
 * by the names a payment reviewer looks for, then the guides. See the PRD,
 * "Legal and policies".
 */
const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/delivery-policy', label: 'Shipping & Delivery' },
  { href: '/whatsapp-wedding-invitation', label: 'WhatsApp invitation' },
  { href: '/guides/wedding-invitation-message-whatsapp', label: 'Invitation messages' },
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
 * `GoogleAds` loads the Google tag and counts sign-ups (ADR-0013). It is off
 * when no Google Ads id was set at build time. `MetaPixel` does the same for
 * Meta (ADR-0017).
 *
 * A couple's invite does not use this shell. See `app/(invite)/layout.tsx`.
 */
export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // pb-24 keeps the last line of every page clear of the floating WhatsApp
    // button on a phone. SiteHeader is a client component rendered from this
    // Server Component.
    <GoogleAds
      adsId={env.googleAds.id}
      signupLabel={env.googleAds.signupLabel}
      purchaseLabel={env.googleAds.purchaseLabel}
    >
      <MetaPixel pixelId={env.metaPixelId} />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">
        <SiteHeader appName={env.appName} />
        {children}
        <Footer
          brand={env.appName}
          owner={env.appName}
          links={FOOTER_LINKS}
          social={
            <SocialLinks
              instagram={SOCIAL.instagram.url}
              facebook={SOCIAL.facebook.url}
              whatsApp={whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO)}
              email={BUSINESS.email}
            />
          }
        >
          {BUSINESS.natureOfService}
        </Footer>
        <WhatsAppButton />
      </div>
    </GoogleAds>
  );
}

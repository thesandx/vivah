import { GoogleAds } from '@/components/ads/GoogleAdsProvider';
import { MetaPixel } from '@/components/ads/MetaPixel';
import { env } from '@/lib/env';

/**
 * The shell of the sign-up form's own page (`/details`), where ads and bio
 * links land. A Server Component.
 *
 * It has no site header, no footer and no WhatsApp button, on purpose: the
 * product owner wants nothing that leads away from the form, and the page
 * must load fast on a phone. It keeps the two ad tags, because the form
 * counts its sign-ups as conversions (ADR-0013, ADR-0017).
 */
export default function LeadLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GoogleAds
      adsId={env.googleAds.id}
      signupLabel={env.googleAds.signupLabel}
      purchaseLabel={env.googleAds.purchaseLabel}
    >
      <MetaPixel pixelId={env.metaPixelId} />
      {children}
    </GoogleAds>
  );
}

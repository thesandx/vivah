import type { Metadata } from 'next';

import { VisitTracker } from '@/components/analytics/VisitTracker';
import { SignupScreen } from '@/components/lead/SignupScreen';

/**
 * The sign-up form on a page of its own, for ads and the Instagram and
 * Facebook bios. A `vivah.online/#details` link comes here before the home
 * page draws (`lib/details-link.ts`), and a new link can point here directly.
 *
 * It is static and carries only the form's JavaScript, so it shows at once
 * on a slow phone. The home page, with its video, sample invite and reviews,
 * is not loaded at all.
 *
 * `VisitTracker` counts the visit in the `/admin` Visitors tab as before
 * (ADR-0014): the screen is marked as the hero section, and a preview made
 * here is credited to `details-link`.
 */
export const metadata: Metadata = {
  title: 'Make your wedding website',
  description:
    'Make your wedding website in a few quick steps. Each guest gets an invite with their own name. See it free first.',
  alternates: { canonical: '/' },
  // A form, not a page to find in search: the home page is the one to rank.
  robots: { index: false, follow: true },
};

export default function DetailsPage() {
  return (
    <VisitTracker>
      <SignupScreen />
    </VisitTracker>
  );
}

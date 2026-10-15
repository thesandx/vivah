import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { WeddingDetailsForm } from '@/components/dashboard/WeddingDetailsForm';
import { AppBar } from '@/components/layout/AppBar';
import { env } from '@/lib/env';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { canEditWedding } from '@/lib/wedding-details';
import { getCurrentUser } from '@/services/auth.service';
import { getWeddingBySlug } from '@/services/wedding.service';

import { saveWeddingDetailsAction } from './actions';

/**
 * `GET /dashboard/edit/<slug>` — the form that changes one invite's details.
 *
 * Only the couple (the session's phone number is the wedding's owner number)
 * sees it. Anyone else gets a 404, not a 403, so a stranger
 * cannot tell which addresses exist. The Server Action checks again on save:
 * hiding the form is a courtesy, not the control.
 */

export const metadata: Metadata = {
  title: 'Edit your invite',
  description: 'Change the names, date, time and venue on your wedding invite.',
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it can never be statically rendered.
export const dynamic = 'force-dynamic';

export default async function EditWeddingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (user === null) redirect(`/sign-in?next=/dashboard/edit/${encodeURIComponent(slug)}`);

  const wedding = await getWeddingBySlug(slug);
  if (wedding === null || !canEditWedding(user.phoneNumber, wedding.ownerPhoneE164)) {
    notFound();
  }

  return (
    <>
      <AppBar
        title="Edit invite"
        back={{ fallbackHref: '/dashboard', label: 'Back to dashboard' }}
      />

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-3 lg:items-start lg:gap-12">
        <header className="flex flex-col gap-2 lg:sticky lg:top-24">
          <h1 className="text-title break-words">
            {wedding.bride} &amp; {wedding.groom}
          </h1>
          <p className="text-ink-soft break-all">{inviteHostLabel(wedding.slug, env.rootDomain)}</p>
          <p className="text-small text-ink-soft">
            Guests see a change as soon as you save. The web address stays the same, so links you
            already shared keep working.
          </p>
        </header>

        <WeddingDetailsForm
          className="lg:col-span-2"
          save={saveWeddingDetailsAction.bind(null, wedding.slug)}
          inviteHref={inviteHref(wedding.slug, env.rootDomain)}
          initial={{
            bride: wedding.bride,
            groom: wedding.groom,
            weddingDate: wedding.weddingDate ?? '',
            ceremonyTime: wedding.ceremonyTime ?? '',
            venueName: wedding.venueName ?? '',
            venueCity: wedding.venueCity ?? '',
            venueMapsUrl: wedding.venueMapsUrl ?? '',
          }}
        />
      </main>
    </>
  );
}

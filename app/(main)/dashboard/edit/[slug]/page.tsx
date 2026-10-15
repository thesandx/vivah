import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { CoupleSite } from '@/app/(main)/dashboard/couple-site';
import { AppBar } from '@/components/layout/AppBar';
import { canEditWedding } from '@/lib/wedding-details';
import { getCurrentUser } from '@/services/auth.service';
import { getWeddingBySlug } from '@/services/wedding.service';

/**
 * `GET /dashboard/edit/<slug>` — one site's details and guest links, for a
 * number that owns more than one site. `/dashboard` opens the newest site
 * directly; this page opens any other one.
 *
 * Only the couple (the session's phone number is the wedding's owner number)
 * sees it. Anyone else gets a 404, not a 403, so a stranger
 * cannot tell which addresses exist. The Server Actions check again on save:
 * hiding the form is a courtesy, not the control.
 */

export const metadata: Metadata = {
  title: 'My site',
  description: 'See and change your wedding site, and make an invite link for each guest.',
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
  const phone = user.phoneNumber;
  if (wedding === null || phone === null || !canEditWedding(phone, wedding.ownerPhoneE164)) {
    notFound();
  }

  return (
    <>
      <AppBar title="My site" back={{ fallbackHref: '/dashboard', label: 'Back to dashboard' }} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <CoupleSite wedding={wedding} phoneE164={phone} />
      </main>
    </>
  );
}

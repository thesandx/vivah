import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { coupleNames } from '@/lib/couple-names';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel } from '@/lib/site-host';
import { getCurrentUser } from '@/services/auth.service';
import { weddingsOwnedBy } from '@/services/wedding.service';

import { CoupleSite } from './couple-site';

/**
 * `GET /dashboard` — the couple's own site: its details and its guest links.
 *
 * The site is found by the phone number they signed in with. The number comes
 * from the verified Firebase session (phone OTP), so a couple sees only the
 * site they paid for from that number. Google sign-in has no phone number,
 * so it gets a prompt to sign in by phone.
 *
 * A couple has one site, so the page opens it directly. If a number ever has
 * more than one, the newest opens here and the others are listed below it.
 *
 * Do not add a `loading.tsx` here, for the reason in `profile/page.tsx`.
 */

export const metadata: Metadata = {
  title: 'My site',
  description: 'See and change your wedding site, and make an invite link for each guest.',
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it can never be statically rendered.
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (user === null) {
    // `?site=` arrives from "Edit details" on a live invite. Sign-in uses it
    // to hint which number to use.
    const { site } = await searchParams;
    const query = typeof site === 'string' ? `&site=${encodeURIComponent(site)}` : '';
    redirect(`/sign-in?next=/dashboard${query}`);
  }

  const phone = user.phoneNumber;
  // Newest first: the repository orders by `createdAt` descending.
  const owned = phone === null ? [] : await weddingsOwnedBy(phone);
  const [site, ...others] = owned;

  return (
    <>
      <AppBar title="My site" back={{ fallbackHref: '/', label: 'Back to home' }} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        {phone !== null && site !== undefined ? (
          <>
            <CoupleSite wedding={site} phoneE164={phone} />
            {others.length > 0 && (
              <section className="flex flex-col gap-4" aria-labelledby="other-sites">
                <h2 id="other-sites" className="text-heading">
                  Your other sites
                </h2>
                <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {others.map((wedding) => (
                    <Card key={wedding.id} as="li" className="flex flex-col gap-3">
                      <p className="font-display text-heading break-words">
                        {coupleNames(wedding)}
                      </p>
                      <p className="text-small text-ink-soft break-all">
                        {inviteHostLabel(wedding.slug, env.rootDomain)}
                      </p>
                      <Link
                        href={`/dashboard/edit/${wedding.slug}`}
                        className={buttonStyles({ variant: 'secondary', block: true })}
                      >
                        Open this site
                      </Link>
                    </Card>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="text-title">My site</h1>
              {phone !== null && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="text-ink-soft">
                    Signed in as{' '}
                    <span className="text-ink font-medium">{formatPhoneForDisplay(phone)}</span>
                  </p>
                  <SignOutButton redirectTo="/" />
                </div>
              )}
            </header>

            {phone === null ? (
              <EmptyState
                title="Sign in with your phone number"
                action={<SignOutButton redirectTo="/sign-in?next=/dashboard" variant="secondary" />}
              >
                Your site is linked to the phone number you paid with. Sign out, then sign in again
                with that number.
              </EmptyState>
            ) : (
              <EmptyState
                title="No site on this number"
                action={
                  <Link href="/" className={buttonStyles({})}>
                    Make your invite
                  </Link>
                }
              >
                We found no paid site for {formatPhoneForDisplay(phone)}. If you paid with another
                number, sign out and sign in with that one.
              </EmptyState>
            )}
          </>
        )}
      </main>
    </>
  );
}

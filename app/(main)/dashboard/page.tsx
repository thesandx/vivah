import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { formatWeddingDate } from '@/lib/wedding-date';
import { isAdminPhone } from '@/lib/wedding-details';
import { getCurrentUser } from '@/services/auth.service';
import { weddingsOwnedBy } from '@/services/wedding.service';

/**
 * `GET /dashboard` — a couple's invites, found by the phone number they
 * signed in with.
 *
 * The number comes from the verified Firebase session (phone OTP), so a
 * couple sees only the invites they paid for from that number. Google
 * sign-in has no phone number, so it gets a prompt to sign in by phone.
 *
 * Do not add a `loading.tsx` here, for the reason in `profile/page.tsx`.
 */

export const metadata: Metadata = {
  title: 'Your dashboard',
  description: 'Change the names, date, time and venue on your wedding invite.',
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it can never be statically rendered.
export const dynamic = 'force-dynamic';

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (user === null) redirect('/sign-in?next=/dashboard');

  const phone = user.phoneNumber;
  const owned = phone === null ? [] : await weddingsOwnedBy(phone);
  const admin = phone !== null && isAdminPhone(phone, env.adminPhoneNumbers);

  return (
    <>
      <AppBar title="Dashboard" back={{ fallbackHref: '/', label: 'Back to home' }} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-title">Your invites</h1>
          {phone !== null && (
            <p className="text-ink-soft">
              Signed in as{' '}
              <span className="text-ink font-medium">{formatPhoneForDisplay(phone)}</span>
            </p>
          )}
        </header>

        {admin && (
          <Card
            tone="butter"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="font-medium">You are an admin. You can see and edit every invite.</p>
            <Link href="/dashboard/admin" className={buttonStyles({ variant: 'secondary' })}>
              Open admin
            </Link>
          </Card>
        )}

        {phone === null ? (
          <EmptyState
            title="Sign in with your phone number"
            action={<SignOutButton redirectTo="/sign-in?next=/dashboard" variant="secondary" />}
          >
            Your invites are linked to the phone number you paid with. Sign out, then sign in again
            with that number.
          </EmptyState>
        ) : owned.length === 0 ? (
          <EmptyState
            title="No invite on this number"
            action={
              <Link href="/" className={buttonStyles({})}>
                Make your invite
              </Link>
            }
          >
            We found no paid invite for {formatPhoneForDisplay(phone)}. If you paid with another
            number, sign in with that one.
          </EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {owned.map((wedding) => (
              <Card key={wedding.id} as="li" className="flex flex-col gap-3">
                <p className="font-display text-heading break-words">
                  {wedding.bride} &amp; {wedding.groom}
                </p>
                <p className="text-small text-ink-soft">
                  {wedding.weddingDate === null
                    ? 'Date not added yet'
                    : formatWeddingDate(wedding.weddingDate)}
                </p>
                <a
                  href={inviteHref(wedding.slug, env.rootDomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand decoration-butter text-small font-semibold break-all underline decoration-2 underline-offset-4"
                >
                  {inviteHostLabel(wedding.slug, env.rootDomain)}
                </a>
                <Link
                  href={`/dashboard/edit/${wedding.slug}`}
                  className={buttonStyles({ variant: 'secondary', block: true })}
                >
                  Edit details
                </Link>
              </Card>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { ContactLink } from '@/components/ui/ContactLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { formatWeddingDate } from '@/lib/wedding-date';
import { isAdminPhone } from '@/lib/wedding-details';
import { getCurrentUser } from '@/services/auth.service';
import { listWeddings } from '@/services/wedding.service';

/**
 * `GET /dashboard/admin` — every published invite, newest first, 50 a page.
 *
 * Only a phone number in `ADMIN_PHONE_NUMBERS` sees it. Anyone else gets a
 * 404, so the page does not advertise itself. Each row links to the same edit
 * form the couple uses; the save checks the admin list again on the server.
 */

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Every published wedding invite.',
  robots: { index: false, follow: false },
};

// Reads the session cookie, so it can never be statically rendered.
export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (user === null) redirect('/sign-in?next=/dashboard/admin');
  if (user.phoneNumber === null || !isAdminPhone(user.phoneNumber, env.adminPhoneNumbers)) {
    notFound();
  }

  const { cursor } = await searchParams;
  const page = await listWeddings(typeof cursor === 'string' ? cursor : undefined);

  return (
    <>
      <AppBar title="Admin" back={{ fallbackHref: '/dashboard', label: 'Back to dashboard' }} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-title">All invites</h1>
          <p className="text-ink-soft">Newest first. Open one to change its details.</p>
        </header>

        {page.items.length === 0 ? (
          <EmptyState title="No invites yet">
            Published invites show here as soon as a couple pays.
          </EmptyState>
        ) : (
          <ul className="border-line rounded-card bg-surface divide-line flex flex-col divide-y-2 border-2">
            {page.items.map((wedding) => (
              <li
                key={wedding.id}
                className="flex flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center md:gap-6"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-display text-heading break-words">
                    {wedding.bride} &amp; {wedding.groom}
                  </p>
                  <a
                    href={inviteHref(wedding.slug, env.rootDomain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand decoration-butter text-small font-semibold break-all underline decoration-2 underline-offset-4"
                  >
                    {inviteHostLabel(wedding.slug, env.rootDomain)}
                  </a>
                  <p className="text-small text-ink-soft">
                    {wedding.weddingDate === null
                      ? 'Date not added yet'
                      : formatWeddingDate(wedding.weddingDate)}
                    {(wedding.venueCity ?? null) !== null && ` · ${wedding.venueCity}`}
                  </p>
                  <ContactLink
                    kind="phone"
                    value={formatPhoneForDisplay(wedding.ownerPhoneE164)}
                    className="text-small"
                  />
                </div>
                <Link
                  href={`/dashboard/edit/${wedding.slug}`}
                  className={buttonStyles({ variant: 'secondary', className: 'md:w-auto' })}
                >
                  Edit
                  <span className="sr-only">
                    {' '}
                    {wedding.bride} &amp; {wedding.groom}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <nav aria-label="Pages" className="flex flex-wrap gap-3">
          {cursor !== undefined && (
            <Link href="/dashboard/admin" className={buttonStyles({ variant: 'quiet' })}>
              Back to newest
            </Link>
          )}
          {page.nextCursor !== null && (
            <Link
              href={`/dashboard/admin?cursor=${encodeURIComponent(page.nextCursor)}`}
              className={buttonStyles({ variant: 'secondary' })}
            >
              Next page
            </Link>
          )}
        </nav>
      </main>
    </>
  );
}

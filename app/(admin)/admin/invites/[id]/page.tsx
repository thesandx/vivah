import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  changeWeddingAddressAction,
  changeWeddingPhoneAction,
  deleteWeddingAction,
  pauseWeddingAction,
  releaseAddressAction,
  restoreWeddingAction,
  resumeWeddingAction,
  saveWeddingDetailsAsAdmin,
} from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { CopyButton } from '@/components/admin/CopyButton';
import { StateBadge } from '@/components/admin/StateBadge';
import { WeddingDetailsForm } from '@/components/dashboard/WeddingDetailsForm';
import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ContactLink } from '@/components/ui/ContactLink';
import { formatAdminTime, weddingState } from '@/lib/admin-list';
import { whatsAppChatUrl } from '@/lib/business';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel, inviteHref, inviteUrl } from '@/lib/site-host';
import { getWeddingForAdmin } from '@/services/admin.service';
import { getAdminSession } from '@/services/admin-session.service';

/**
 * `GET /admin/invites/<wedding id>` — one invite, and everything the admin can
 * do to it: edit, change the number or the address, make it unavailable,
 * delete, restore, release the address, and send the link to the couple.
 *
 * Every button is a Server Action that checks the admin session again.
 */

export const metadata: Metadata = {
  title: 'Admin: invite',
  description: 'Change, pause or delete one wedding invite.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  if (!env.adminEnabled) notFound();
  const session = await getAdminSession();
  if (session === null) return <AdminSignInScreen />;

  const { id } = await params;
  const wedding = await getWeddingForAdmin(id);
  if (wedding === null) notFound();

  const state = weddingState(wedding);
  const address = inviteHostLabel(wedding.slug, env.rootDomain);
  const link =
    env.rootDomain === '' ? inviteHref(wedding.slug, '') : inviteUrl(wedding.slug, env.rootDomain);
  const message = `Hi ${wedding.bride} & ${wedding.groom}, your wedding invite is live at ${link} . Share it with your guests on WhatsApp.`;

  return (
    <>
      <AppBar
        title={`${wedding.bride} & ${wedding.groom}`}
        back={{ fallbackHref: '/admin', label: 'Back to all invites' }}
        end={<AdminSignOutButton />}
      />
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-3 lg:items-start lg:gap-10">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <div className="flex flex-wrap items-center gap-3">
            <StateBadge state={state} />
          </div>
          <a
            href={inviteHref(wedding.slug, env.rootDomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand decoration-butter font-semibold break-all underline decoration-2 underline-offset-4"
          >
            {address}
          </a>
          <dl className="text-small grid gap-2">
            <div>
              <dt className="text-ink-soft">Couple&apos;s WhatsApp</dt>
              <dd>
                <ContactLink kind="phone" value={formatPhoneForDisplay(wedding.ownerPhoneE164)} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Paid</dt>
              <dd>{formatAdminTime(wedding.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Last changed</dt>
              <dd>{formatAdminTime(wedding.updatedAt)}</dd>
            </div>
            {wedding.deletedAt !== null && (
              <div>
                <dt className="text-ink-soft">Deleted</dt>
                <dd>{formatAdminTime(wedding.deletedAt)}</dd>
              </div>
            )}
          </dl>
          <Link
            href={`/admin/previews/${wedding.leadId}`}
            className={buttonStyles({ variant: 'quiet' })}
          >
            Open the preview it was paid from
          </Link>
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Send the link to the couple</h2>
            <p className="text-small text-ink-soft break-all">{link}</p>
            <div className="flex flex-wrap gap-3">
              <CopyButton value={link} />
              <a
                href={whatsAppChatUrl(wedding.ownerPhoneE164, message)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ variant: 'primary' })}
              >
                Send on WhatsApp
              </a>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Invite details</h2>
            <WeddingDetailsForm
              save={saveWeddingDetailsAsAdmin.bind(null, wedding.id)}
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
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Couple&apos;s WhatsApp number</h2>
            <p className="text-small text-ink-soft">
              Guests&apos; RSVPs go to this number, and the couple signs in to their dashboard with
              it.
            </p>
            <AdminActionForm
              action={changeWeddingPhoneAction.bind(null, wedding.id)}
              label="Change number"
              field={{
                name: 'phone',
                label: 'New number',
                defaultValue: wedding.ownerPhoneE164,
                hint: 'Ten digits for India, or the full number with +.',
                inputMode: 'tel',
              }}
            />
          </Card>

          {wedding.deletedAt === null && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-heading">Address</h2>
              <p className="text-small text-ink-soft">
                Moving the invite breaks every link already shared with guests. The old address
                becomes free for another couple.
              </p>
              <AdminActionForm
                action={changeWeddingAddressAction.bind(null, wedding.id)}
                label="Move invite"
                field={{
                  name: 'slug',
                  label: 'New address',
                  defaultValue: wedding.slug,
                  hint: `Lowercase letters, digits and hyphens. Becomes <address>.${env.rootDomain || 'vivah.online'}.`,
                }}
                confirm={{
                  title: 'Move this invite?',
                  body: 'Links already shared with guests stop working. Send the couple the new link after.',
                  confirmLabel: 'Move invite',
                }}
              />
            </Card>
          )}

          {/*
            One form per card, whatever the state, so React keeps it mounted
            when the page re-renders after an action, and its result message
            stays on screen.
          */}
          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Availability</h2>
            <p className="text-small text-ink-soft">
              {state === 'live' &&
                'Making it unavailable shows guests "This invite is not available right now" instead of the invite. Nothing is deleted.'}
              {state === 'unavailable' && 'Guests see "not available right now" at the moment.'}
              {state === 'deleted' && 'Restore the invite first.'}
            </p>
            {state !== 'deleted' && (
              <AdminActionForm
                key="availability"
                {...(state === 'live'
                  ? {
                      action: pauseWeddingAction.bind(null, wedding.id),
                      label: 'Make unavailable',
                      confirm: {
                        title: 'Make this invite unavailable?',
                        body: `Guests who open ${address} see a short "not available right now" note.`,
                        confirmLabel: 'Make unavailable',
                      },
                    }
                  : {
                      action: resumeWeddingAction.bind(null, wedding.id),
                      label: 'Make live again',
                      variant: 'primary' as const,
                    })}
              />
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Delete</h2>
            <p className="text-small text-ink-soft">
              {wedding.deletedAt === null
                ? 'Guests see "no invite at this address". The address stays reserved, so you can restore the invite as it was.'
                : `Deleted. Restore it, or release ${address} so another couple can use it. To restore it later, the address must still be free.`}
            </p>
            <AdminActionForm
              key="delete"
              {...(wedding.deletedAt === null
                ? {
                    action: deleteWeddingAction.bind(null, wedding.id),
                    label: 'Delete invite',
                    confirm: {
                      title: 'Delete this invite?',
                      body: `${address} stops working for guests. You can restore it from here.`,
                      confirmLabel: 'Delete invite',
                    },
                  }
                : {
                    action: restoreWeddingAction.bind(null, wedding.id),
                    label: 'Restore invite',
                    variant: 'primary' as const,
                  })}
            />
            {wedding.deletedAt !== null && (
              <AdminActionForm
                action={releaseAddressAction.bind(null, wedding.id)}
                label="Release address"
                confirm={{
                  title: 'Release this address?',
                  body: `Another couple can then publish at ${address}.`,
                  confirmLabel: 'Release address',
                }}
              />
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

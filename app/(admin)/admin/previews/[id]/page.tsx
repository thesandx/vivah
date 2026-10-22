import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  deleteLeadAction,
  reactivatePreviewAction,
  restoreLeadAction,
} from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { CopyButton } from '@/components/admin/CopyButton';
import { StateBadge } from '@/components/admin/StateBadge';
import { AppBar } from '@/components/layout/AppBar';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ContactLink } from '@/components/ui/ContactLink';
import { formatAdminTime, leadState, previewTimeNote } from '@/lib/admin-list';
import { whatsAppChatUrl } from '@/lib/business';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import {
  NUDGE_DAYS,
  NUDGE_TOPICS,
  nudgeLabel,
  nudgeMessage,
  nudgeStatus,
  openAgainMessage,
} from '@/lib/preview-nudges';
import { siteOrigin } from '@/lib/seo';
import { formatWeddingDate } from '@/lib/wedding-date';
import { getLeadForAdmin } from '@/services/admin.service';
import { getAdminSession } from '@/services/admin-session.service';
import { getWeddingBySlug } from '@/services/wedding.service';

/**
 * `GET /admin/previews/<lead id>` — one preview: who asked, when it expires,
 * and the buttons to reactivate it, send it again, delete or restore it.
 */

export const metadata: Metadata = {
  title: 'Admin: preview',
  description: 'Reactivate, resend or delete one invite preview.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  if (!env.adminEnabled) notFound();
  const session = await getAdminSession();
  if (session === null) return <AdminSignInScreen />;

  const { id } = await params;
  const lead = await getLeadForAdmin(id);
  if (lead === null) notFound();

  const now = new Date();
  const state = leadState(lead, now);
  const wedding = lead.weddingSlug === undefined ? null : await getWeddingBySlug(lead.weddingSlug);
  const link = `${siteOrigin(env.rootDomain, env.appUrl)}/p/${lead.id}`;
  // The link goes last: WhatsApp on Android shows no link preview for a
  // typed-in message whose link is followed by more text.
  const message = `Hi ${lead.bride} & ${lead.groom}, here is your wedding invite preview. It stays open for 30 minutes from when you open it, so please complete payment within that time.\n\n${link}`;
  const openAgain = openAgainMessage({ bride: lead.bride, groom: lead.groom, link });
  const nudge = nudgeStatus(lead, now);
  const nudgeText =
    nudge.kind === 'due'
      ? nudgeMessage(nudge.day, {
          bride: lead.bride,
          groom: lead.groom,
          link,
          rootDomain: env.rootDomain,
        })
      : null;

  return (
    <>
      <AppBar
        title={`${lead.bride} & ${lead.groom}`}
        back={{ fallbackHref: '/admin?view=previews', label: 'Back to all previews' }}
        end={<AdminSignOutButton />}
      />
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-3 lg:items-start lg:gap-10">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <div>
            <StateBadge state={state} />
          </div>
          <dl className="text-small grid gap-2">
            <div>
              <dt className="text-ink-soft">Couple&apos;s WhatsApp</dt>
              <dd>
                <ContactLink kind="phone" value={formatPhoneForDisplay(lead.phoneE164)} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Wedding date</dt>
              <dd>
                {lead.weddingDate === null ? 'Not given' : formatWeddingDate(lead.weddingDate)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Asked</dt>
              <dd>{formatAdminTime(lead.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">First opened</dt>
              <dd>
                {lead.firstOpenedAt === null ? 'Not yet' : formatAdminTime(lead.firstOpenedAt)}
              </dd>
            </div>
            {lead.status !== 'paid' && (
              <div>
                <dt className="text-ink-soft">30-minute timer</dt>
                <dd>
                  {state === 'expired'
                    ? `Closed ${formatAdminTime(lead.viewEndsAt ?? lead.expiresAt)}`
                    : previewTimeNote(lead, now)}
                </dd>
              </div>
            )}
          </dl>
          {wedding !== null && (
            <Link
              href={`/admin/invites/${wedding.id}`}
              className={buttonStyles({ variant: 'secondary' })}
            >
              Open the paid invite
            </Link>
          )}
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {state !== 'paid' && state !== 'deleted' && (
            <>
              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Send the preview again</h2>
                <p className="text-small text-ink-soft">
                  WhatsApp sending is not automatic yet. Copy the link, or open WhatsApp with the
                  message typed in for you.
                  {state === 'expired' && ' Reactivate it first: the preview has closed.'}
                </p>
                <p className="text-small text-ink-soft break-all">{link}</p>
                <div className="flex flex-wrap gap-3">
                  <CopyButton value={link} />
                  <a
                    href={whatsAppChatUrl(lead.phoneE164, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: 'primary' })}
                  >
                    Send on WhatsApp
                  </a>
                  <a
                    href={whatsAppChatUrl(lead.phoneE164, openAgain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Send &ldquo;open again&rdquo;
                  </a>
                </div>
                <p className="text-small text-ink-soft">
                  Use &ldquo;open again&rdquo; after you reactivate a preview the couple asked to
                  open.
                </p>
              </Card>

              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Daily nudge</h2>
                <p className="text-small text-ink-soft">
                  One WhatsApp message a day for {NUDGE_DAYS} days after the preview, until the
                  couple pays. Stop if they say no.
                </p>
                {nudge.kind === 'due' && nudgeText !== null ? (
                  <>
                    <p className="font-semibold">
                      {nudgeLabel(nudge)}: {NUDGE_TOPICS[nudge.day - 1]}
                    </p>
                    <p className="text-small text-ink-soft whitespace-pre-line break-words">
                      {nudgeText}
                    </p>
                    <div>
                      <a
                        href={whatsAppChatUrl(lead.phoneE164, nudgeText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonStyles({ variant: 'primary' })}
                      >
                        Send Day {nudge.day} nudge
                      </a>
                    </div>
                  </>
                ) : (
                  <p>{nudgeLabel(nudge) ?? 'No nudge: the wedding day has passed.'}</p>
                )}
              </Card>

              <Card className="flex flex-col gap-4">
                <h2 className="text-heading">Reactivate</h2>
                <p className="text-small text-ink-soft">
                  Gives the couple a fresh 30 minutes. The timer starts again when the link is next
                  opened. The next two phones to open it can pay and publish.
                </p>
                <AdminActionForm
                  action={reactivatePreviewAction.bind(null, lead.id)}
                  label="Reactivate preview"
                  variant="primary"
                  {...(state === 'opened' && {
                    confirm: {
                      title: 'Reactivate this preview?',
                      body: 'Its timer stops and starts again from 30:00 on the next open. The phones that opened it must tap the link again to pay.',
                      confirmLabel: 'Reactivate',
                    },
                  })}
                />
              </Card>
            </>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Delete</h2>
            <p className="text-small text-ink-soft">
              {lead.deletedAt === null
                ? 'The preview link stops opening. A paid invite is not affected. You can restore it.'
                : 'Deleted. The preview link does not open.'}
            </p>
            <AdminActionForm
              key="delete"
              {...(lead.deletedAt === null
                ? {
                    action: deleteLeadAction.bind(null, lead.id),
                    label: 'Delete preview',
                    confirm: {
                      title: 'Delete this preview?',
                      body: 'The couple can no longer open the preview link.',
                      confirmLabel: 'Delete preview',
                    },
                  }
                : {
                    action: restoreLeadAction.bind(null, lead.id),
                    label: 'Restore preview',
                    variant: 'primary' as const,
                  })}
            />
          </Card>
        </div>
      </main>
    </>
  );
}

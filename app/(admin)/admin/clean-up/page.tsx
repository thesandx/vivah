import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { eraseTestDataAction } from '@/app/(admin)/admin/actions';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { StateBadge } from '@/components/admin/StateBadge';
import { AppBar } from '@/components/layout/AppBar';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { formatAdminTime, leadState } from '@/lib/admin-list';
import { env } from '@/lib/env';
import { formatPhoneForDisplay } from '@/lib/phone';
import {
  ERASE_CONFIRM_WORD,
  leadCleanupChoice,
  liveLeadIds,
  weddingCleanupChoice,
} from '@/lib/test-data-cleanup';
import { listAllLeads, listAllWeddings } from '@/services/admin.service';
import { getAdminSession } from '@/services/admin-session.service';

/**
 * `GET /admin/clean-up` — "Clear test data": every preview and every deleted
 * invite, with a box to tick, and one button that erases the ticked rows for
 * good (ADR-0016).
 *
 * A couple who paid and whose invite is live is never offered: they show
 * under "Kept", with no box, and the server refuses them too. Payments and
 * the audit log are never erased.
 */

export const metadata: Metadata = {
  title: 'Admin: clear test data',
  description: 'Erase test previews and deleted invites for good.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminCleanUpPage(): Promise<React.JSX.Element> {
  if (!env.adminEnabled) notFound();
  const session = await getAdminSession();
  if (session === null) return <AdminSignInScreen />;

  const now = new Date();
  const [weddingList, leadList] = await Promise.all([listAllWeddings(), listAllLeads()]);
  const live = liveLeadIds(weddingList.items);
  const byNewest = <T extends { createdAt: Date }>(a: T, b: T) =>
    b.createdAt.getTime() - a.createdAt.getTime();

  const deletedWeddings = weddingList.items
    .filter((wedding) => weddingCleanupChoice(wedding) !== 'kept')
    .sort(byNewest);
  const leadRows = [...leadList.items]
    .sort(byNewest)
    .map((lead) => ({ lead, choice: leadCleanupChoice(lead, live, now) }));
  const offered = leadRows.filter((row) => row.choice !== 'kept');
  const kept = leadRows.filter((row) => row.choice === 'kept');

  return (
    <>
      <AppBar
        title="Clear test data"
        back={{ fallbackHref: '/admin?view=deleted', label: 'Back to admin' }}
        end={<AdminSignOutButton />}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-title">Clear test data</h1>
          <p className="text-ink-soft">
            Tick the rows to erase, type {ERASE_CONFIRM_WORD}, then press Erase. A couple who paid
            and is live is never here: they are under Kept. Payments and the activity log stay.
          </p>
        </header>
        <Alert tone="danger" title="Erase is permanent.">
          There is no restore button. Only a database recovery within 7 days brings a row back.
          Unpaid previews still in their week of nudges start unticked: they can be real couples.
        </Alert>
        {(weddingList.capped || leadList.capped) && (
          <Alert tone="info" title="Showing the newest 2,000 only." />
        )}

        <AdminActionForm
          action={eraseTestDataAction}
          label="Erase ticked rows"
          variant="primary"
          field={{
            name: 'confirm',
            label: `Type ${ERASE_CONFIRM_WORD} to confirm`,
            hint: 'Capital letters. This guards against a stray tap.',
          }}
          confirm={{
            title: 'Erase the ticked rows for good?',
            body: 'The ticked previews and deleted invites go for good, with their guest links. Live invites, payments and the activity log stay.',
            confirmLabel: 'Erase for good',
          }}
        >
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card className="flex flex-col gap-3">
              <h2 className="text-heading">Deleted invites ({deletedWeddings.length})</h2>
              {deletedWeddings.length === 0 ? (
                <p className="text-ink-soft">Nothing deleted.</p>
              ) : (
                deletedWeddings.map((wedding) => (
                  <Checkbox
                    key={wedding.id}
                    name="wedding"
                    value={wedding.id}
                    defaultChecked
                    label={`${wedding.bride} & ${wedding.groom}`}
                    hint={`Was ${wedding.slug} · ${formatPhoneForDisplay(wedding.ownerPhoneE164)} · deleted ${formatAdminTime(wedding.deletedAt ?? wedding.updatedAt)}`}
                  />
                ))
              )}
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-heading">Previews ({offered.length})</h2>
              {offered.length === 0 ? (
                <p className="text-ink-soft">No preview to erase.</p>
              ) : (
                offered.map(({ lead, choice }) => (
                  <Checkbox
                    key={lead.id}
                    name="lead"
                    value={lead.id}
                    defaultChecked={choice === 'ticked'}
                    label={`${lead.bride} & ${lead.groom}`}
                    hint={`${stateWord(leadState(lead, now))} · ${formatPhoneForDisplay(lead.phoneE164)} · asked ${formatAdminTime(lead.createdAt)}`}
                  />
                ))
              )}
            </Card>
          </div>
        </AdminActionForm>

        <section className="flex flex-col gap-3">
          <h2 className="text-heading">Kept: paid and live ({kept.length})</h2>
          {kept.length === 0 ? (
            <p className="text-ink-soft">No live invite yet.</p>
          ) : (
            <ul className="border-line rounded-card bg-surface divide-line flex flex-col divide-y-2 border-2">
              {kept.map(({ lead }) => (
                <li
                  key={lead.id}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-6"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-display break-words">
                      {lead.bride} &amp; {lead.groom}
                    </span>
                    <span className="text-small text-ink-soft">
                      {lead.weddingSlug ?? ''} · {formatPhoneForDisplay(lead.phoneE164)}
                    </span>
                  </span>
                  <StateBadge state={leadState(lead, now)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function stateWord(state: ReturnType<typeof leadState>): string {
  const words = {
    sent: 'Not opened',
    opened: 'Opened',
    expired: 'Expired',
    paid: 'Paid, not live',
    deleted: 'Deleted',
  } as const;
  return words[state];
}

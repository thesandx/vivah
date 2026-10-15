import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  resetStepImageAction,
  saveStepImageAction,
  startStepImageUploadAction,
} from '@/app/(admin)/admin/actions';
import { TestimonialsAdmin } from '@/app/(admin)/admin/testimonials-view';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { StateBadge } from '@/components/admin/StateBadge';
import { StepImageUpload } from '@/components/admin/StepImageUpload';
import { AppBar } from '@/components/layout/AppBar';
import { Alert } from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  countBy,
  filterLeads,
  filterWeddings,
  formatAdminTime,
  LEAD_SORT_CHOICES,
  LEAD_STATE_CHOICES,
  leadState,
  parseLeadFilters,
  parseWeddingFilters,
  type SearchParams,
  WEDDING_SORT_CHOICES,
  WEDDING_STATE_CHOICES,
  WEDDING_WHEN_CHOICES,
  weddingState,
} from '@/lib/admin-list';
import { env } from '@/lib/env';
import { HOW_IT_WORKS_STEPS, placeholderImageUrl } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel } from '@/lib/site-host';
import { cn } from '@/lib/utils';
import { formatWeddingDate, todayInIndia } from '@/lib/wedding-date';
import { listAllLeads, listAllWeddings } from '@/services/admin.service';
import { recentAdminActions } from '@/services/admin-audit.service';
import { getAdminSession } from '@/services/admin-session.service';
import { getStepImages } from '@/services/site-content.service';
import { createSignedReadUrl } from '@/services/storage.service';

/**
 * `GET /admin` — the admin dashboard: every invite, every preview, and the
 * log of admin changes, with search, filters and sort.
 *
 * Nothing on the site links here, and the page asks search engines not to
 * index it. The control is the two-step sign-in (ADR-0008): without an admin
 * session this page shows only the sign-in. With `ADMIN_EMAIL` or
 * `ADMIN_PHONE` unset it is a 404 for everyone.
 */

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Manage every wedding invite and preview.',
  robots: { index: false, follow: false },
};

// Reads the admin cookie, so it can never be statically rendered.
export const dynamic = 'force-dynamic';

const VIEWS = [
  { value: 'invites', label: 'Invites' },
  { value: 'previews', label: 'Previews' },
  { value: 'activity', label: 'Activity' },
  { value: 'home', label: 'Home page' },
] as const;

type View = (typeof VIEWS)[number]['value'];

function viewFrom(params: SearchParams): View {
  const raw = params.view;
  return VIEWS.find((view) => view.value === raw)?.value ?? 'invites';
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<React.JSX.Element> {
  if (!env.adminEnabled) notFound();
  const session = await getAdminSession();
  if (session === null) return <AdminSignInScreen />;

  const params = await searchParams;
  const view = viewFrom(params);

  return (
    <>
      <AppBar title="Admin" end={<AdminSignOutButton />} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-10">
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3">
          {VIEWS.map((item) => (
            <Link
              key={item.value}
              href={item.value === 'invites' ? '/admin' : `/admin?view=${item.value}`}
              aria-current={item.value === view ? 'page' : undefined}
              className={buttonStyles({
                variant: item.value === view ? 'primary' : 'secondary',
              })}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {view === 'invites' && <InvitesView params={params} />}
        {view === 'previews' && <PreviewsView params={params} />}
        {view === 'activity' && <ActivityView />}
        {view === 'home' && <HomePageView />}
      </main>
    </>
  );
}

function CappedNotice({ capped }: { capped: boolean }) {
  return capped ? (
    <Alert tone="info" title="Showing the newest 2,000 only.">
      Search or filter to find an older record.
    </Alert>
  ) : null;
}

async function InvitesView({ params }: { params: SearchParams }) {
  const filters = parseWeddingFilters(params);
  const { items, capped } = await listAllWeddings();
  const rows = filterWeddings(items, filters, todayInIndia());
  const counts = countBy(items, weddingState);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Invites</h2>
        <p className="text-ink-soft">
          {counts.get('live') ?? 0} live · {counts.get('unavailable') ?? 0} unavailable ·{' '}
          {counts.get('deleted') ?? 0} deleted
        </p>
      </header>
      <AdminFilters
        view="invites"
        query={filters.q}
        clearHref="/admin"
        menus={[
          { name: 'state', label: 'State', value: filters.state, options: WEDDING_STATE_CHOICES },
          {
            name: 'when',
            label: 'Wedding date',
            value: filters.when,
            options: WEDDING_WHEN_CHOICES,
          },
          { name: 'sort', label: 'Sort', value: filters.sort, options: WEDDING_SORT_CHOICES },
        ]}
      />
      <CappedNotice capped={capped} />
      <p className="text-small text-ink-soft" aria-live="polite">
        {rows.length} of {items.length} shown
      </p>

      {rows.length === 0 ? (
        <EmptyState title={items.length === 0 ? 'No invites yet' : 'Nothing matches'}>
          {items.length === 0
            ? 'Published invites show here as soon as a couple pays.'
            : 'Change the search or the filters.'}
        </EmptyState>
      ) : (
        <ul className="border-line rounded-card bg-surface divide-line flex flex-col divide-y-2 border-2">
          {rows.map((wedding) => (
            <li key={wedding.id}>
              <Link
                href={`/admin/invites/${wedding.id}`}
                className="hover:bg-sunken flex flex-col gap-2 p-4 sm:p-5 md:flex-row md:items-center md:gap-6"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-display text-heading break-words">
                    {wedding.bride} &amp; {wedding.groom}
                  </span>
                  <span className="text-brand text-small font-semibold break-all">
                    {inviteHostLabel(wedding.slug, env.rootDomain)}
                  </span>
                  <span className="text-small text-ink-soft">
                    {wedding.weddingDate === null
                      ? 'Date not added yet'
                      : formatWeddingDate(wedding.weddingDate)}
                    {' · '}
                    {formatPhoneForDisplay(wedding.ownerPhoneE164)}
                    {' · '}paid {formatAdminTime(wedding.createdAt)}
                  </span>
                </span>
                <StateBadge state={weddingState(wedding)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function PreviewsView({ params }: { params: SearchParams }) {
  const filters = parseLeadFilters(params);
  const now = new Date();
  const { items, capped } = await listAllLeads();
  const rows = filterLeads(items, filters, now);
  const counts = countBy(items, (lead) => leadState(lead, now));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Previews</h2>
        <p className="text-ink-soft">
          {counts.get('sent') ?? 0} not opened · {counts.get('opened') ?? 0} opened ·{' '}
          {counts.get('expired') ?? 0} expired · {counts.get('paid') ?? 0} paid
        </p>
      </header>
      <AdminFilters
        view="previews"
        query={filters.q}
        clearHref="/admin?view=previews"
        menus={[
          { name: 'state', label: 'State', value: filters.state, options: LEAD_STATE_CHOICES },
          { name: 'sort', label: 'Sort', value: filters.sort, options: LEAD_SORT_CHOICES },
        ]}
      />
      <CappedNotice capped={capped} />
      <p className="text-small text-ink-soft" aria-live="polite">
        {rows.length} of {items.length} shown
      </p>

      {rows.length === 0 ? (
        <EmptyState title={items.length === 0 ? 'No previews yet' : 'Nothing matches'}>
          {items.length === 0
            ? 'A preview shows here when a couple fills in the home page form.'
            : 'Change the search or the filters.'}
        </EmptyState>
      ) : (
        <ul className="border-line rounded-card bg-surface divide-line flex flex-col divide-y-2 border-2">
          {rows.map((lead) => {
            const state = leadState(lead, now);
            return (
              <li key={lead.id}>
                <Link
                  href={`/admin/previews/${lead.id}`}
                  className="hover:bg-sunken flex flex-col gap-2 p-4 sm:p-5 md:flex-row md:items-center md:gap-6"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-display text-heading break-words">
                      {lead.bride} &amp; {lead.groom}
                    </span>
                    <span className="text-small text-ink-soft">
                      {formatPhoneForDisplay(lead.phoneE164)} · asked{' '}
                      {formatAdminTime(lead.createdAt)}
                      {state === 'sent' || state === 'opened'
                        ? ` · expires ${formatAdminTime(lead.expiresAt)}`
                        : ''}
                    </span>
                  </span>
                  <StateBadge state={state} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function ActivityView() {
  const entries = await recentAdminActions();
  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Activity</h2>
        <p className="text-ink-soft">The last 100 changes made from this dashboard.</p>
      </header>
      {entries.length === 0 ? (
        <EmptyState title="No changes yet">Every change you make here is listed.</EmptyState>
      ) : (
        <ol className="border-line rounded-card bg-surface divide-line flex flex-col divide-y-2 border-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 p-4 sm:p-5">
              <span>{entry.detail}</span>
              <span className={cn('text-small text-ink-soft')}>
                {formatAdminTime(entry.createdAt)}
                {entry.targetType === 'wedding' && (
                  <>
                    {' · '}
                    <Link
                      href={`/admin/invites/${entry.targetId}`}
                      className="text-brand font-semibold underline underline-offset-4"
                    >
                      Open invite
                    </Link>
                  </>
                )}
                {entry.targetType === 'site' && (
                  <>
                    {' · '}
                    <Link
                      href="/admin?view=home"
                      className="text-brand font-semibold underline underline-offset-4"
                    >
                      Open the home page tab
                    </Link>
                  </>
                )}
                {entry.targetType === 'lead' && (
                  <>
                    {' · '}
                    <Link
                      href={`/admin/previews/${entry.targetId}`}
                      className="text-brand font-semibold underline underline-offset-4"
                    >
                      Open preview
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/** The image each step shows now: a short-lived link to the upload, or the placeholder. */
async function currentStepImages(): Promise<{ urls: string[]; custom: boolean[] } | null> {
  try {
    const images = await getStepImages({ fresh: true });
    const paths = HOW_IT_WORKS_STEPS.map((step) => images[`step${step.step}`]);
    const urls = await Promise.all(
      paths.map((path, index) =>
        path === null
          ? placeholderImageUrl(HOW_IT_WORKS_STEPS[index]?.step ?? 1)
          : createSignedReadUrl(path),
      ),
    );
    return { urls, custom: paths.map((path) => path !== null) };
  } catch (error) {
    logger.error('Reading the How it works images failed', error);
    return null;
  }
}

async function HomePageView() {
  const current = await currentStepImages();
  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">Home page</h2>
        <p className="text-ink-soft">
          What the home page shows that you can change without a deploy.
        </p>
      </header>
      <h3 className="text-heading">How it works</h3>
      <p className="text-ink-soft">
        The phone screens in the How it works section. Use a phone screenshot, tall and narrow. The
        home page shows a new image within five minutes.
      </p>
      {current === null ? (
        <Alert tone="danger" title="The images could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <ol className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li
              key={step.step}
              className="border-line rounded-card bg-surface flex flex-col gap-4 border-2 p-4"
            >
              <h3 className="text-heading">
                Step {step.step}: {step.title}
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed URL that expires; next/image would cache it */}
              <img
                src={current.urls[index]}
                alt={step.alt}
                className="rounded-card bg-sunken aspect-6/13 w-40 self-center object-cover object-top"
              />
              <p className="text-small text-ink-soft">
                {current.custom[index] === true ? 'Your upload.' : 'The placeholder.'}
              </p>
              <StepImageUpload
                startUpload={startStepImageUploadAction.bind(null, step.step)}
                saveUpload={saveStepImageAction.bind(null, step.step)}
              />
              {current.custom[index] === true && (
                <AdminActionForm
                  action={resetStepImageAction.bind(null, step.step)}
                  label="Use the placeholder"
                  confirm={{
                    title: `Remove the image for step ${step.step}?`,
                    body: 'The home page shows the placeholder again. Your upload is deleted.',
                    confirmLabel: 'Remove it',
                  }}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      <TestimonialsAdmin />
    </>
  );
}

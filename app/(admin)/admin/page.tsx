import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  removeDemoVideoAction,
  removeSongAction,
  resetStepImageAction,
  saveDemoVideoAction,
  saveSongAction,
  saveStepImageAction,
  startDemoVideoUploadAction,
  startSongUploadAction,
  startStepImageUploadAction,
} from '@/app/(admin)/admin/actions';
import { TestimonialsAdmin } from '@/app/(admin)/admin/testimonials-view';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { AdminSignInScreen } from '@/components/admin/AdminSignInScreen';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';
import { DemoVideoForm } from '@/components/admin/DemoVideoForm';
import { SongSlotForm } from '@/components/admin/SongSlotForm';
import { StateBadge } from '@/components/admin/StateBadge';
import { StepImageUpload } from '@/components/admin/StepImageUpload';
import { AppBar } from '@/components/layout/AppBar';
import { Alert } from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  countBy,
  DELETED_SORT_CHOICES,
  filterLeads,
  filterWeddings,
  formatAdminTime,
  LEAD_SORT_CHOICES,
  LEAD_STATE_CHOICES,
  leadState,
  parseLeadFilters,
  parseWeddingFilters,
  previewTimeNote,
  type SearchParams,
  WEDDING_SORT_CHOICES,
  WEDDING_STATE_CHOICES,
  WEDDING_WHEN_CHOICES,
  weddingState,
} from '@/lib/admin-list';
import { demoVideoRoute } from '@/lib/demo-video';
import { env } from '@/lib/env';
import { HOW_IT_WORKS_STEPS, placeholderImageUrl } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import { inviteHostLabel } from '@/lib/site-host';
import { cn } from '@/lib/utils';
import { formatWeddingDate, todayInIndia } from '@/lib/wedding-date';
import { SONG_SLOTS, songUrl } from '@/lib/wedding-songs';
import { listAllLeads, listAllWeddings } from '@/services/admin.service';
import { recentAdminActions } from '@/services/admin-audit.service';
import { getAdminSession } from '@/services/admin-session.service';
import { getDemoVideo } from '@/services/demo-video.service';
import { getStepImages } from '@/services/site-content.service';
import { createSignedReadUrl } from '@/services/storage.service';
import { getSongSlots } from '@/services/wedding-songs.service';

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
  { value: 'deleted', label: 'Deleted' },
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

        {view === 'invites' && <InvitesView params={params} tab="invites" />}
        {view === 'deleted' && <InvitesView params={params} tab="deleted" />}
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

/**
 * The Invites tab (live and unavailable) and the Deleted tab (archived, with
 * their addresses freed). One list, split by `deletedAt`.
 */
async function InvitesView({ params, tab }: { params: SearchParams; tab: 'invites' | 'deleted' }) {
  const filters = parseWeddingFilters(params, tab);
  const all = await listAllWeddings();
  const capped = all.capped;
  const items = all.items.filter((row) => (row.deletedAt !== null) === (tab === 'deleted'));
  const rows = filterWeddings(items, filters, todayInIndia());
  const counts = countBy(items, weddingState);
  const clearHref = tab === 'deleted' ? '/admin?view=deleted' : '/admin';
  const whenMenu = {
    name: 'when',
    label: 'Wedding date',
    value: filters.when,
    options: WEDDING_WHEN_CHOICES,
  };

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 className="text-title">{tab === 'deleted' ? 'Deleted invites' : 'Invites'}</h2>
        <p className="text-ink-soft">
          {tab === 'deleted'
            ? 'Their addresses are free for other couples. Open one to restore it at any free address.'
            : `${counts.get('live') ?? 0} live · ${counts.get('unavailable') ?? 0} unavailable`}
        </p>
      </header>
      <AdminFilters
        view={tab}
        query={filters.q}
        clearHref={clearHref}
        menus={
          tab === 'deleted'
            ? [
                whenMenu,
                { name: 'sort', label: 'Sort', value: filters.sort, options: DELETED_SORT_CHOICES },
              ]
            : [
                {
                  name: 'state',
                  label: 'State',
                  value: filters.state,
                  options: WEDDING_STATE_CHOICES,
                },
                whenMenu,
                {
                  name: 'sort',
                  label: 'Sort',
                  value: filters.sort,
                  options: WEDDING_SORT_CHOICES,
                },
              ]
        }
      />
      <CappedNotice capped={capped} />
      <p className="text-small text-ink-soft" aria-live="polite">
        {rows.length} of {items.length} shown
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title={
            items.length === 0
              ? tab === 'deleted'
                ? 'Nothing deleted'
                : 'No invites yet'
              : 'Nothing matches'
          }
        >
          {items.length === 0
            ? tab === 'deleted'
              ? 'A deleted invite shows here, ready to restore.'
              : 'Published invites show here as soon as a couple pays.'
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
                  <span
                    className={cn(
                      'text-small font-semibold break-all',
                      wedding.deletedAt === null ? 'text-brand' : 'text-ink-soft',
                    )}
                  >
                    {wedding.deletedAt === null ? '' : 'Was '}
                    {inviteHostLabel(wedding.slug, env.rootDomain)}
                  </span>
                  <span className="text-small text-ink-soft">
                    {wedding.weddingDate === null
                      ? 'Date not added yet'
                      : formatWeddingDate(wedding.weddingDate)}
                    {' · '}
                    {formatPhoneForDisplay(wedding.ownerPhoneE164)}
                    {' · '}paid {formatAdminTime(wedding.createdAt)}
                    {wedding.deletedAt !== null &&
                      ` · deleted ${formatAdminTime(wedding.deletedAt)}`}
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
                      {previewTimeNote(lead, now) === null
                        ? ''
                        : ` · ${previewTimeNote(lead, now)}`}
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
      <DemoVideoAdmin />
      <SongsAdmin />
      <TestimonialsAdmin />
    </>
  );
}

/** The "Watch a demo" video on the home page. */
async function DemoVideoAdmin() {
  let demo: Awaited<ReturnType<typeof getDemoVideo>> | null = null;
  try {
    demo = await getDemoVideo({ fresh: true });
  } catch (error) {
    logger.error('Reading the demo video failed', error);
  }
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading">Demo video</h3>
      <p className="text-ink-soft max-w-prose">
        The &ldquo;Watch a demo&rdquo; button on the home page plays this video. With no video, the
        button lists the steps instead. A new upload replaces the video at once.
      </p>
      {demo === null ? (
        <Alert tone="danger" title="The demo video could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <div className="border-line rounded-card bg-surface flex flex-col gap-4 border-2 p-4">
          <DemoVideoForm
            // A new key after a save, so the form starts empty.
            key={demo.file ?? 'empty'}
            current={
              demo.file === null
                ? null
                : {
                    src: demoVideoRoute(demo.file),
                    poster: demo.poster === null ? '' : demoVideoRoute(demo.poster),
                  }
            }
            startUpload={startDemoVideoUploadAction}
            save={saveDemoVideoAction}
          />
          {demo.file !== null && (
            <AdminActionForm
              action={removeDemoVideoAction}
              label="Remove the video"
              confirm={{
                title: 'Remove the demo video?',
                body: 'The home page lists the steps in its place. The file stays in storage.',
                confirmLabel: 'Remove it',
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

/** The four songs couples choose from on step 4 of the sign-up card. */
async function SongsAdmin() {
  let songs: Awaited<ReturnType<typeof getSongSlots>> | null = null;
  try {
    songs = await getSongSlots({ fresh: true });
  } catch (error) {
    logger.error('Reading the wedding songs failed', error);
  }
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading">Wedding songs</h3>
      <p className="text-ink-soft max-w-prose">
        Couples choose one of these on step 4 of the sign-up card, and guests can play it on their
        invite. Upload only songs you have the right to use. With no songs, the card skips the step.
        A removed or replaced song stays on the sites that already chose it.
      </p>
      {songs === null ? (
        <Alert tone="danger" title="The songs could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <ol className="grid gap-6 md:grid-cols-2">
          {SONG_SLOTS.map((slot) => {
            const song = songs[`slot${slot}`];
            return (
              <li
                key={slot}
                className="border-line rounded-card bg-surface flex flex-col gap-4 border-2 p-4"
              >
                <SongSlotForm
                  // A new key after a save, so the form starts from the saved name.
                  key={song?.file ?? 'empty'}
                  slot={slot}
                  current={song === null ? null : { name: song.name, src: songUrl(song.file) }}
                  startUpload={startSongUploadAction.bind(null, slot)}
                  save={saveSongAction.bind(null, slot)}
                />
                {song !== null && (
                  <AdminActionForm
                    action={removeSongAction.bind(null, slot)}
                    label="Remove this song"
                    confirm={{
                      title: `Remove song ${slot}?`,
                      body: 'New couples no longer see it. Sites that chose it keep it.',
                      confirmLabel: 'Remove it',
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

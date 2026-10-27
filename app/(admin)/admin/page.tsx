import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  removeDemoVideoAction,
  removeSongAction,
  resetSampleVenuesAction,
  resetStepImageAction,
  resetWhatsAppHelloAction,
  saveDemoVideoAction,
  saveSampleVenuesAction,
  saveSongAction,
  saveStepImageAction,
  saveWhatsAppHelloAction,
  startDemoVideoUploadAction,
  startSongUploadAction,
  startStepImageUploadAction,
} from '@/app/(admin)/admin/actions';
import { CouponsView } from '@/app/(admin)/admin/coupons-view';
import { TestimonialsAdmin } from '@/app/(admin)/admin/testimonials-view';
import { VisitorsView } from '@/app/(admin)/admin/visitors-view';
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
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
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
import { coupleNames } from '@/lib/couple-names';
import { demoVideoRoute, SITE_VIDEO_SLOTS, type SiteVideoSlot } from '@/lib/demo-video';
import { env } from '@/lib/env';
import { HOW_IT_WORKS_STEPS, placeholderImageUrl } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { formatPhoneForDisplay } from '@/lib/phone';
import { nudgeLabel, nudgeStatus } from '@/lib/preview-nudges';
import { functionVenueField, SAMPLE_GUEST, SAMPLE_SLUG } from '@/lib/sample-invite';
import { inviteHostLabel, inviteHref } from '@/lib/site-host';
import { cn } from '@/lib/utils';
import { formatWeddingDate, todayInIndia } from '@/lib/wedding-date';
import { FESTIVITY_LABELS, FUNCTION_KINDS } from '@/lib/wedding-functions';
import { SONG_SLOTS, songUrl } from '@/lib/wedding-songs';
import {
  DEFAULT_WHATSAPP_HELLO,
  WHATSAPP_CHAT_PATH,
  WHATSAPP_HELLO_MAX_LENGTH,
} from '@/lib/whatsapp-hello';
import { listAllLeads, listAllWeddings } from '@/services/admin.service';
import { recentAdminActions } from '@/services/admin-audit.service';
import { getAdminSession } from '@/services/admin-session.service';
import { getDemoVideo } from '@/services/demo-video.service';
import { getSampleVenuesForAdmin } from '@/services/sample-invite.service';
import { getStepImages } from '@/services/site-content.service';
import { createSignedReadUrl } from '@/services/storage.service';
import { getSongSlots } from '@/services/wedding-songs.service';
import { getWhatsAppHelloForAdmin } from '@/services/whatsapp-hello.service';

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
  { value: 'visitors', label: 'Visitors' },
  { value: 'coupons', label: 'Coupons' },
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
        {view === 'visitors' && <VisitorsView params={params} />}
        {view === 'coupons' && <CouponsView />}
        {view === 'activity' && <ActivityView />}
        {view === 'home' && <HomePageView />}
      </main>
    </>
  );
}

/** To `/admin/clean-up`, where test previews and deleted invites are erased. */
function ClearTestDataLink() {
  return (
    <Link
      href="/admin/clean-up"
      className={buttonStyles({ variant: 'secondary', className: 'self-start' })}
    >
      Clear test data
    </Link>
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
        {tab === 'deleted' && <ClearTestDataLink />}
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
                    {coupleNames(wedding)}
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
        <ClearTestDataLink />
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
                      {coupleNames(lead)}
                    </span>
                    <span className="text-small text-ink-soft">
                      {formatPhoneForDisplay(lead.phoneE164)} · asked{' '}
                      {formatAdminTime(lead.createdAt)}
                      {previewTimeNote(lead, now) === null
                        ? ''
                        : ` · ${previewTimeNote(lead, now)}`}
                    </span>
                    {nudgeLabel(nudgeStatus(lead, now)) !== null && (
                      <span className="text-small font-semibold">
                        {nudgeLabel(nudgeStatus(lead, now))}
                      </span>
                    )}
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
                {entry.targetType === 'coupon' && (
                  <>
                    {' · '}
                    <Link
                      href="/admin?view=coupons"
                      className="text-brand font-semibold underline underline-offset-4"
                    >
                      Open coupons
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
      {SITE_VIDEO_SLOTS.map((slot) => (
        <SiteVideoAdmin key={slot} slot={slot} />
      ))}
      <SongsAdmin />
      <WhatsAppHelloAdmin />
      <SampleVenuesAdmin />
      <TestimonialsAdmin />
    </>
  );
}

/** Where each uploaded video shows, and what shows without it. */
const SITE_VIDEO_ADMIN: Record<
  SiteVideoSlot,
  { title: string; intro: string; removeTitle: string; removeBody: string }
> = {
  demo: {
    title: 'Demo video',
    intro:
      'The “Watch a demo” button on the home page plays this video. With no video, the button lists the steps instead. A new upload replaces the video at once.',
    removeTitle: 'Remove the demo video?',
    removeBody: 'The home page lists the steps in its place. The file stays in storage.',
  },
  'help-edit-details': {
    title: 'Help video: edit details',
    intro:
      'The help page plays this next to “Change the time, venue or map”. With no video, only the steps show. A new upload replaces the video at once.',
    removeTitle: 'Remove the edit details video?',
    removeBody: 'The help page shows only the steps. The file stays in storage.',
  },
  'help-guest-invite': {
    title: 'Help video: guest invites',
    intro:
      'The help page plays this next to “Make and send a personal invite for each guest”. With no video, only the steps show. A new upload replaces the video at once.',
    removeTitle: 'Remove the guest invite video?',
    removeBody: 'The help page shows only the steps. The file stays in storage.',
  },
  'help-functions': {
    title: 'Help video: functions',
    intro:
      'The help page plays this next to “Add your haldi, mehndi and other functions”. With no video, only the steps show. A new upload replaces the video at once.',
    removeTitle: 'Remove the functions video?',
    removeBody: 'The help page shows only the steps. The file stays in storage.',
  },
  'help-families': {
    title: 'Help video: families',
    intro:
      'The help page plays this next to “Add your parents’ and grandparents’ names”. With no video, only the steps show. A new upload replaces the video at once.',
    removeTitle: 'Remove the families video?',
    removeBody: 'The help page shows only the steps. The file stays in storage.',
  },
};

/** One uploaded video: the home page's demo, or one on `/help`. */
async function SiteVideoAdmin({ slot }: { slot: SiteVideoSlot }) {
  const copy = SITE_VIDEO_ADMIN[slot];
  let demo: Awaited<ReturnType<typeof getDemoVideo>> | null = null;
  try {
    demo = await getDemoVideo({ fresh: true, slot });
  } catch (error) {
    logger.error('Reading a site video failed', error, { slot });
  }
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading">{copy.title}</h3>
      <p className="text-ink-soft max-w-prose">{copy.intro}</p>
      {demo === null ? (
        <Alert tone="danger" title="The video could not be read.">
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
                    src: demoVideoRoute(demo.file, slot),
                    poster: demo.poster === null ? '' : demoVideoRoute(demo.poster, slot),
                  }
            }
            startUpload={startDemoVideoUploadAction.bind(null, slot)}
            save={saveDemoVideoAction.bind(null, slot)}
          />
          {demo.file !== null && (
            <AdminActionForm
              action={removeDemoVideoAction.bind(null, slot)}
              label="Remove the video"
              confirm={{
                title: copy.removeTitle,
                body: copy.removeBody,
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

/**
 * The sample invite's venues: the wedding's name, address and map link, and
 * each function's venue and map link. The home page's "Try it here" phone
 * shows the same sample, so a save changes both.
 */
async function WhatsAppHelloAdmin() {
  let message: string | null = null;
  try {
    message = await getWhatsAppHelloForAdmin();
  } catch (error) {
    logger.error('Reading the WhatsApp first message failed', error);
  }
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading">WhatsApp first message</h3>
      <p className="text-ink-soft max-w-prose">
        The message WhatsApp types for a visitor who taps a “chat with us” link: the green button,
        the footer icon, the home and Help pages, and the Contact and policy pages. The visitor can
        change it before they send it. A change shows within a minute.
      </p>
      {message === null ? (
        <Alert tone="danger" title="The message could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <div className="border-line rounded-card bg-surface flex flex-col gap-4 border-2 p-4">
          <AdminActionForm action={saveWhatsAppHelloAction} label="Save message" variant="primary">
            <Textarea
              label="First message"
              name="message"
              defaultValue={message}
              maxLength={WHATSAPP_HELLO_MAX_LENGTH}
              rows={3}
              required
            />
          </AdminActionForm>
          <a
            href={WHATSAPP_CHAT_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold underline underline-offset-4"
          >
            Try the link
          </a>
          {message !== DEFAULT_WHATSAPP_HELLO && (
            <AdminActionForm
              action={resetWhatsAppHelloAction}
              label="Use the default message"
              confirm={{
                title: 'Put back the default message?',
                body: `WhatsApp types “${DEFAULT_WHATSAPP_HELLO}” again. Your message is replaced.`,
                confirmLabel: 'Put it back',
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

async function SampleVenuesAdmin() {
  let venues: Awaited<ReturnType<typeof getSampleVenuesForAdmin>> | null = null;
  try {
    venues = await getSampleVenuesForAdmin();
  } catch (error) {
    logger.error('Reading the sample invite venues failed', error);
  }
  const sampleUrl = `${inviteHref(SAMPLE_SLUG, env.rootDomain)}/${SAMPLE_GUEST}`;
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-heading">Sample invite venues</h3>
      <p className="text-ink-soft max-w-prose">
        The venue names, addresses and Google Maps links on the{' '}
        <a
          href={sampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-semibold underline underline-offset-4"
        >
          sample invite
        </a>
        , and in the “Try it here” phone on the home page. A change shows within a minute.
      </p>
      {venues === null ? (
        <Alert tone="danger" title="The venues could not be read.">
          Reload the page to try again.
        </Alert>
      ) : (
        <div className="border-line rounded-card bg-surface flex flex-col gap-6 border-2 p-4">
          <AdminActionForm action={saveSampleVenuesAction} label="Save venues" variant="primary">
            <fieldset className="flex flex-col gap-4">
              <legend className="text-heading mb-2">Wedding</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Venue name"
                  name="venueName"
                  defaultValue={venues.venueName}
                  maxLength={80}
                  autoComplete="off"
                  required
                />
                <Input
                  label="Address (town and state)"
                  name="venueCity"
                  defaultValue={venues.venueCity}
                  maxLength={80}
                  autoComplete="off"
                  required
                />
              </div>
              <Input
                label="Google Maps link"
                name="venueMapsUrl"
                type="url"
                inputMode="url"
                defaultValue={venues.venueMapsUrl}
                maxLength={500}
                autoComplete="off"
                required
              />
            </fieldset>
            <ol className="grid gap-4 md:grid-cols-2">
              {FUNCTION_KINDS.map((kind) => (
                <li key={kind} className="border-line rounded-card border-2 p-4">
                  <fieldset className="flex flex-col gap-4">
                    <legend className="text-heading mb-2">{FESTIVITY_LABELS[kind].name}</legend>
                    <Input
                      label="Venue"
                      name={functionVenueField(kind, 'venue')}
                      defaultValue={venues.functions[kind].venue}
                      maxLength={100}
                      autoComplete="off"
                      required
                    />
                    <Input
                      label="Google Maps link"
                      name={functionVenueField(kind, 'mapsUrl')}
                      type="url"
                      inputMode="url"
                      defaultValue={venues.functions[kind].mapsUrl}
                      maxLength={500}
                      autoComplete="off"
                      required
                    />
                  </fieldset>
                </li>
              ))}
            </ol>
          </AdminActionForm>
          <AdminActionForm
            action={resetSampleVenuesAction}
            label="Use the default venues"
            confirm={{
              title: 'Put back the default venues?',
              body: 'The sample invite shows the Delhi venues it started with. Your venues are replaced.',
              confirmLabel: 'Put them back',
            }}
          />
        </div>
      )}
    </section>
  );
}

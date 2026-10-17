import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { InviteGate } from '@/components/invite/InviteGate';
import { InviteTheme } from '@/components/invite/InviteTheme';
import { PreviewNotch } from '@/components/invite/PreviewNotch';
import { PreviewShield } from '@/components/invite/PreviewShield';
import { PreviewWatermark } from '@/components/invite/PreviewWatermark';
import { PublishBanner } from '@/components/invite/PublishBanner';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { PageShell } from '@/components/layout/PageShell';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Alert } from '@/components/ui/Alert';
import { Face } from '@/components/ui/Face';
import { PRICE_FROM_RUPEES } from '@/lib/business';
import { env } from '@/lib/env';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { inviteDomainLabel, inviteHostLabel, inviteHref, madeByUrl } from '@/lib/site-host';
import { songUrl } from '@/lib/wedding-songs';
import { getPreview, type PreviewAccess } from '@/services/lead.service';
import { checkSlug, freeSlugSuggestions } from '@/services/wedding.service';

import { checkSlugAction, publishAction } from './actions';

export const metadata: Metadata = {
  title: 'Your invite preview',
  description: 'A private preview of your wedding invite, before you publish it at your own link.',
  // A preview is private. It must never appear in search results.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** What the couple reads when the preview cannot be shown. */
const PROBLEM: Record<
  Exclude<PreviewAccess['state'], 'ok' | 'unopened'>,
  { title: string; body: string }
> = {
  'not-found': {
    title: 'This preview link does not work',
    body: 'Check that you opened the full link from your WhatsApp message.',
  },
  expired: {
    title: 'This preview has expired',
    body: 'A preview stays open for 48 hours. Start again on the home page to get a new one.',
  },
  'other-browser': {
    title: 'Open this preview on your own phone',
    body: 'A preview opens only in the two browsers that opened it first, so it cannot be forwarded as an invite.',
  },
};

/**
 * `/preview/<lead id>` — the couple's private preview, before payment.
 *
 * It is the couple's invite exactly as guests will see it: the same envelope,
 * the same song, the same page, from the same components, with the couple's
 * own details. Until it is paid, three things are added: a "Preview" notch at
 * the top, the banner at the foot that publishes it, and a faint
 * "vivah.online · preview" watermark over the whole screen. A screenshot or a
 * screen recording cannot be stopped from a web page, so the watermark is in
 * every frame instead; `PreviewShield` also takes away the right-click menu
 * and the developer-tools keys on a desktop. Once paid, neither renders.
 *
 * An async Server Component: it reads the lead and the browser's preview
 * cookie on the server, so nothing about the lead reaches a browser that may
 * not see it. The cookie is set by `GET /p/<id>`; a visit straight to this
 * address without it is sent there first.
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const access = await getPreview(id, store.get(PREVIEW_COOKIE_NAME)?.value);

  if (access.state === 'unopened') redirect(`/p/${encodeURIComponent(id)}`);

  if (access.state !== 'ok') {
    const problem = PROBLEM[access.state];
    return (
      <>
        <SiteHeader appName={env.appName} />
        <PageShell className="flex-1 justify-center">
          <section className="flex max-w-prose flex-col gap-6">
            <span className="bg-sunken border-line inline-grid size-20 place-items-center rounded-full border-2">
              <Face mood="sleepy" size={64} />
            </span>
            <h1 className="text-title">{problem.title}</h1>
            <p className="text-ink-soft">{problem.body}</p>
          </section>
        </PageShell>
      </>
    );
  }

  const { lead } = access;
  const song =
    lead.song === undefined ? null : { name: lead.song.name, src: songUrl(lead.song.file) };
  const domainLabel = inviteDomainLabel(env.rootDomain);
  const published = lead.status === 'paid' && lead.weddingSlug !== undefined;

  // The couple chose their address on the sign-up card. Check it is still
  // free, so the banner shows it with the publish button. Only when it was
  // taken meanwhile, or the lead is older than that step, does the banner
  // offer addresses. Those are free ones only, so a couple never sees "taken"
  // for an address we chose for them. Publishing checks again either way.
  const desired = lead.desiredSlug;
  const chosen =
    published || desired === undefined
      ? undefined
      : (await checkSlug(desired)).available
        ? desired
        : undefined;
  const suggestions =
    published || chosen !== undefined ? [] : await freeSlugSuggestions(lead.bride, lead.groom);

  let dock: React.ReactNode;
  if (published && lead.weddingSlug !== undefined) {
    dock = (
      <section className="bg-surface border-line rounded-t-sheet mx-auto flex w-full max-w-xl flex-col items-center gap-3 border-2 border-b-0 px-5 py-5 text-center">
        <p className="font-script text-title text-brand">Your invite is live</p>
        <a
          href={inviteHref(lead.weddingSlug, env.rootDomain)}
          className="text-heading text-brand decoration-butter font-semibold break-all underline decoration-2 underline-offset-4"
        >
          {inviteHostLabel(lead.weddingSlug, env.rootDomain)}
        </a>
      </section>
    );
  } else {
    dock = (
      <PublishBanner
        bride={lead.bride}
        groom={lead.groom}
        leadId={lead.id}
        {...(chosen !== undefined && { chosen })}
        suggestions={suggestions}
        domainLabel={domainLabel}
        priceRupees={PRICE_FROM_RUPEES}
        hasSong={song !== null}
        {...(desired !== undefined &&
          chosen === undefined && {
            notice: (
              <Alert tone="info" title="Your address was taken">
                Another couple published {inviteHostLabel(desired, env.rootDomain)} after you chose
                it. Choose another address below.
              </Alert>
            ),
          })}
        checkSlug={checkSlugAction}
        publish={publishAction}
      />
    );
  }

  return (
    <InviteTheme className="bg-paper text-body flex flex-1 flex-col">
      {!published && (
        <>
          <PreviewWatermark label={`${domainLabel} · preview`} />
          <PreviewShield />
        </>
      )}
      <InviteGate
        guestName={null}
        couple={`${lead.bride} & ${lead.groom}`}
        song={song}
        top={<PreviewNotch note={published ? 'your invite is live' : 'only you can see this'} />}
        dock={dock}
      >
        {/* Room at the foot, so the banner never covers the last lines. */}
        <main className="bg-jewel-maroon-deep flex flex-1 flex-col pb-132">
          <ShubhVivahInvite
            bride={lead.bride}
            groom={lead.groom}
            guestName={null}
            weddingDate={lead.weddingDate}
            ceremonyTime={null}
            venueName={null}
            venueCity={null}
            venueMapsUrl={null}
            rsvpPhoneE164={lead.phoneE164}
            madeByUrl={madeByUrl(env.rootDomain, env.appUrl)}
            stickyRsvp={false}
            venuePendingNote="Once your invite is yours, you can add your venue, time and map from your own dashboard whenever you are ready. It will appear right here for every guest, with directions to find you."
            className="flex-1"
          />
        </main>
      </InviteGate>
    </InviteTheme>
  );
}

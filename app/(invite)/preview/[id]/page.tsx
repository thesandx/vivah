import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { InviteTheme } from '@/components/invite/InviteTheme';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { SlugPicker } from '@/components/invite/SlugPicker';
import { PageShell } from '@/components/layout/PageShell';
import { Alert } from '@/components/ui/Alert';
import { Face } from '@/components/ui/Face';
import { env } from '@/lib/env';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { inviteHostLabel, inviteHref, madeByUrl, normaliseHost } from '@/lib/site-host';
import { getPreview, type PreviewAccess } from '@/services/lead.service';
import { freeSlugSuggestions } from '@/services/wedding.service';

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
    body: 'A preview opens only in the browser that opened it first, so it cannot be forwarded as an invite.',
  },
};

/**
 * `/preview/<lead id>` — the couple's private preview, before payment.
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
      <PageShell className="flex-1 justify-center">
        <section className="flex max-w-prose flex-col gap-6">
          <span className="bg-sunken border-line inline-grid size-20 place-items-center rounded-full border-2">
            <Face mood="sleepy" size={64} />
          </span>
          <h1 className="text-title">{problem.title}</h1>
          <p className="text-ink-soft">{problem.body}</p>
        </section>
      </PageShell>
    );
  }

  const { lead } = access;
  const domainLabel = env.rootDomain === '' ? 'vivah.online' : normaliseHost(env.rootDomain);

  // Already published: show where, instead of the address step.
  if (lead.status === 'paid' && lead.weddingSlug !== undefined) {
    const href = inviteHref(lead.weddingSlug, env.rootDomain);
    return (
      <PageShell>
        <div className="grid gap-10 lg:grid-cols-5 lg:items-start lg:gap-12">
          <InviteTheme className="bg-paper border-butter rounded-card overflow-hidden border-2 lg:col-span-3">
            <ShubhVivahInvite
              bride={lead.bride}
              groom={lead.groom}
              weddingDate={lead.weddingDate}
              guestName={null}
              ceremonyTime={null}
              venueName={null}
              venueCity={null}
              venueMapsUrl={null}
              rsvpPhoneE164={null}
              madeByUrl={madeByUrl(env.rootDomain, env.appUrl)}
            />
          </InviteTheme>
          <section className="flex flex-col gap-5 lg:col-span-2">
            <h2 className="text-title">Your invite is live</h2>
            <Alert tone="success" title="Share this link with your guests">
              <a href={href} className="font-medium underline">
                {inviteHostLabel(lead.weddingSlug, env.rootDomain)}
              </a>
            </Alert>
          </section>
        </div>
      </PageShell>
    );
  }

  // Only free addresses are offered, so a couple never sees "taken" for an
  // address we chose for them. The publish step checks again, so a stale
  // answer here can never overwrite another couple.
  const suggestions = await freeSlugSuggestions(lead.bride, lead.groom);

  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-5 lg:items-start lg:gap-12">
        <InviteTheme className="bg-paper border-butter rounded-card overflow-hidden border-2 lg:col-span-3">
          <ShubhVivahInvite
            bride={lead.bride}
            groom={lead.groom}
            weddingDate={lead.weddingDate}
            guestName={null}
            ceremonyTime={null}
            venueName={null}
            venueCity={null}
            venueMapsUrl={null}
            rsvpPhoneE164={null}
            madeByUrl={madeByUrl(env.rootDomain, env.appUrl)}
          />
        </InviteTheme>
        <section className="flex flex-col gap-5 lg:col-span-2">
          <h2 className="text-title">This is your invite</h2>
          <p className="text-ink-soft max-w-prose">
            Only this phone can open this preview. Choose your address and publish, and your guests
            can open it at once. This preview stays here for 48 hours from your request.
          </p>
          <SlugPicker
            leadId={lead.id}
            suggestions={suggestions}
            domainLabel={domainLabel}
            checkSlug={checkSlugAction}
            publish={publishAction}
          />
        </section>
      </div>
    </PageShell>
  );
}

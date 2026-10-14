import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { InviteCard } from '@/components/invite/InviteCard';
import { PageShell } from '@/components/layout/PageShell';
import { Alert } from '@/components/ui/Alert';
import { Face } from '@/components/ui/Face';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { getPreview, type PreviewAccess } from '@/services/lead.service';

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
  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-5 lg:items-start lg:gap-12">
        <InviteCard
          bride={lead.bride}
          groom={lead.groom}
          weddingDate={lead.weddingDate}
          preview
          className="lg:col-span-3"
        />
        <section className="flex flex-col gap-5 lg:col-span-2">
          <h2 className="text-title">This is your invite</h2>
          <p className="text-ink-soft max-w-prose">
            Only this phone can open this preview. After you pay, it goes live at your own link, and
            you can add each function, the venue, a map and photos.
          </p>
          <Alert tone="info" title="Payment is the next step">
            Payment is not open yet. This preview stays here for 48 hours from your request.
          </Alert>
        </section>
      </div>
    </PageShell>
  );
}

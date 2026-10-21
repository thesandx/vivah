import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { InviteGate } from '@/components/invite/InviteGate';
import { InviteTheme } from '@/components/invite/InviteTheme';
import { PaymentSuccess } from '@/components/invite/PaymentSuccess';
import { PreviewNotch } from '@/components/invite/PreviewNotch';
import { PreviewShield } from '@/components/invite/PreviewShield';
import { PreviewTimer } from '@/components/invite/PreviewTimer';
import { PreviewWatermark } from '@/components/invite/PreviewWatermark';
import { PublishBanner } from '@/components/invite/PublishBanner';
import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';
import { PageShell } from '@/components/layout/PageShell';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Alert } from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/Button';
import { Face } from '@/components/ui/Face';
import { BUSINESS, PRICE_FROM_RUPEES, whatsAppChatUrl } from '@/lib/business';
import { env } from '@/lib/env';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { previewClosesAt } from '@/lib/preview-timer';
import { siteOrigin } from '@/lib/seo';
import { inviteDomainLabel, inviteHostLabel, inviteHref, madeByUrl } from '@/lib/site-host';
import { songUrl } from '@/lib/wedding-songs';
import { getPreview, type PreviewAccess } from '@/services/lead.service';
import { paymentMode, paymentProviderName } from '@/services/payment.service';
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
    title: 'This preview has closed',
    body: 'A preview stays open for 30 minutes. Message us on WhatsApp and we will open it again for you.',
  },
};

/**
 * `/preview/<lead id>` — the couple's private preview, before payment.
 *
 * It is the couple's invite exactly as guests will see it: the same envelope,
 * the same song, the same page, from the same components, with the couple's
 * own details. Until it is paid, three things are added: a "Preview" notch at
 * the top with the preview's 30-minute countdown, the banner at the foot that
 * publishes it, and a faint
 * "vivah.online · preview" watermark over the whole screen. A screenshot or a
 * screen recording cannot be stopped from a web page, so the watermark is in
 * every frame instead; `PreviewShield` also takes away the right-click menu
 * and the developer-tools keys on a desktop. Once paid, neither renders.
 *
 * Anyone with the link sees it while its 30 minutes run (ADR-0010). Then it
 * closes for everyone until an admin reactivates it. With Cashfree on, every
 * browser that sees it gets the pay banner (ADR-0011); the free test publish,
 * in development only, keeps to the two bound browsers (ADR-0007, ADR-0009).
 *
 * An async Server Component: it reads the lead and the browser's preview
 * cookie on the server, so nothing about a closed preview reaches a browser.
 * The timer starts at `GET /p/<id>`; a visit straight to this address before
 * that is sent there first.
 */
/** What the return from Cashfree's page reports, in `?payment=`. */
const PAYMENT_NOTICE: Record<string, { tone: 'info' | 'danger'; title: string; body: string }> = {
  pending: {
    tone: 'info',
    title: 'We are confirming your payment',
    body: 'If money left your account, do not pay again. Your invite goes live in a few minutes. Reload this page to check, or message us on WhatsApp.',
  },
  failed: {
    tone: 'danger',
    title: 'Your payment was not completed',
    body: 'Your invite is not published yet. Try again below.',
  },
};

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;
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
            {access.state === 'expired' && (
              <a
                href={whatsAppChatUrl(
                  BUSINESS.whatsAppE164,
                  `Hi, please open my invite preview again: ${siteOrigin(env.rootDomain, env.appUrl)}/p/${id}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ variant: 'primary' })}
              >
                Message us on WhatsApp
              </a>
            )}
          </section>
        </PageShell>
      </>
    );
  }

  const { lead, canPublish } = access;
  const closesAt = previewClosesAt(lead);
  const renderedAt = new Date().getTime();
  const song =
    lead.song === undefined ? null : { name: lead.song.name, src: songUrl(lead.song.file) };
  const domainLabel = inviteDomainLabel(env.rootDomain);
  const published = lead.status === 'paid' && lead.weddingSlug !== undefined;
  // Paid, but another couple published the address first. ADR-0011.
  const paidWithoutAddress = lead.status === 'paid' && lead.weddingSlug === undefined;
  const mode = paymentMode();
  const providerName = paymentProviderName();
  // With real payment, any browser that can see the preview may pay: the
  // money is the proof. Only the free test publish needs a bound browser.
  const canPay = mode === 'test' ? canPublish : true;
  const paymentNotice =
    typeof payment === 'string' && !paidWithoutAddress ? PAYMENT_NOTICE[payment] : undefined;

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
  } else if (canPay || paidWithoutAddress) {
    let notice: React.ReactNode;
    if (paidWithoutAddress) {
      notice = (
        <Alert tone="info" title="Your payment is received">
          Another couple published{' '}
          {desired === undefined ? 'your address' : inviteHostLabel(desired, env.rootDomain)} a
          moment before you. Choose another address below. There is nothing more to pay.
        </Alert>
      );
    } else if (paymentNotice !== undefined) {
      notice = (
        <Alert tone={paymentNotice.tone} title={paymentNotice.title}>
          {paymentNotice.body}
        </Alert>
      );
    } else if (desired !== undefined && chosen === undefined) {
      notice = (
        <Alert tone="info" title="Your address was taken">
          Another couple published {inviteHostLabel(desired, env.rootDomain)} after you chose it.
          Choose another address below.
        </Alert>
      );
    }
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
        {...(notice !== undefined && { notice })}
        mode={paidWithoutAddress ? 'paid' : mode === 'test' ? 'test' : 'live'}
        {...(providerName !== null && { providerName })}
        checkSlug={checkSlugAction}
        publish={publishAction}
      />
    );
  }

  return (
    <InviteTheme className="bg-paper text-body flex flex-1 flex-col">
      {published && payment === 'success' && lead.weddingSlug !== undefined && (
        <PaymentSuccess
          liveUrl={inviteHref(lead.weddingSlug, env.rootDomain)}
          hostLabel={inviteHostLabel(lead.weddingSlug, env.rootDomain)}
        />
      )}
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
        top={
          <PreviewNotch note={published ? 'your invite is live' : 'only you can see this'}>
            {closesAt !== null && (
              <PreviewTimer endsAt={closesAt.getTime()} renderedAt={renderedAt} />
            )}
          </PreviewNotch>
        }
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
            venuePlaceholder
            className="flex-1"
          />
        </main>
      </InviteGate>
    </InviteTheme>
  );
}

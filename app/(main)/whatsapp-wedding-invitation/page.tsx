import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqList } from '@/components/guides/FaqList';
import { GuideCta } from '@/components/guides/GuideCta';
import { LastUpdated } from '@/components/guides/LastUpdated';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonStyles } from '@/components/ui/Button';
import { env } from '@/lib/env';
import { breadcrumbSchema, faqPageSchema, SHARE_IMAGE, siteOrigin } from '@/lib/seo';
import { LANDING_FAQS } from '@/lib/whatsapp-guides';

/**
 * `GET /whatsapp-wedding-invitation` — the page for the core pitch.
 *
 * It answers "wedding invitation for whatsapp", "whatsapp invitation for
 * wedding" and "digital wedding invitation" (PRD, SEO plan, WhatsApp keyword
 * cluster). It follows the answer-ready pattern: a plain H1, a direct answer,
 * a comparison table, the steps, then the questions with `FAQPage` schema.
 */

const PATH = '/whatsapp-wedding-invitation';
const TITLE = 'Wedding Invitation for WhatsApp with Guest Name';
const DESCRIPTION =
  'A WhatsApp invitation for your wedding: a digital wedding invitation on its own link, with each guest’s name, the venue map and RSVP.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'website',
    images: [SHARE_IMAGE],
  },
};

const STEPS = [
  'Type the bride’s and groom’s names and the wedding date.',
  'We send a private preview of your invite to your WhatsApp. Check it before you pay.',
  'Pay once, and the invite goes live on its own link, like raadha-shyam.vivah.online.',
  'Make a link for each guest. Their invite opens with their name.',
  'Send each link on WhatsApp. Guests tap it, see the map and reply on WhatsApp.',
];

const COMPARISON = [
  { label: 'How it reaches the guest', paper: 'By hand or by post', digital: 'A link on WhatsApp' },
  {
    label: 'Guest’s name on it',
    paper: 'Written by hand',
    digital: 'On every link, automatically',
  },
  { label: 'Venue map', paper: 'No', digital: 'One tap opens Google Maps' },
  { label: 'RSVP', paper: 'A phone call', digital: 'A WhatsApp reply with one tap' },
  {
    label: 'Change a date or venue',
    paper: 'Print again',
    digital: 'Edit the invite, the link stays',
  },
  { label: 'Reaches guests abroad', paper: 'Weeks by post', digital: 'At once' },
];

export default function WhatsAppWeddingInvitationPage() {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  return (
    <PageShell>
      <JsonLd data={faqPageSchema(LANDING_FAQS)} />
      <JsonLd
        data={breadcrumbSchema(origin, [
          { name: 'Home', path: '/' },
          { name: 'WhatsApp wedding invitation', path: PATH },
        ])}
      />

      <header className="flex max-w-prose flex-col gap-5">
        <h1 className="text-hero">Wedding invitation for WhatsApp, with every guest’s name</h1>
        <p className="text-ink-soft">
          A WhatsApp wedding invitation is a link you send instead of a printed card. Your guest
          taps it and sees your invite as a web page, greeted by name, with the date, a countdown,
          the venue map and an RSVP button. You see it before you pay.
        </p>
        <div>
          <Link href="/" className={buttonStyles({ size: 'lg' })}>
            See my invite
          </Link>
        </div>
        <LastUpdated />
      </header>

      <section className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4">
          <h2 className="text-title">How a WhatsApp invitation for a wedding works</h2>
          <ol className="text-ink-soft flex list-decimal flex-col gap-3 pl-6">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-title">What your guest sees</h2>
          <p className="text-ink-soft">
            WhatsApp shows a card above the link with your names, the date and the guest’s name, so
            the message looks like an invitation, not a bare link. The invite opens in WhatsApp’s
            own browser on any Android phone or iPhone. There is nothing to install.
          </p>
          <p className="text-ink-soft">
            Each guest’s invite starts with &ldquo;Hi&rdquo; and their name. The RSVP button opens a
            WhatsApp chat with you, with the reply already typed.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-title">Paper card vs digital wedding invitation</h2>
        <div className="border-line rounded-card overflow-x-auto border-2">
          <table className="w-full min-w-120 text-left">
            <thead className="bg-sunken">
              <tr>
                <th scope="col" className="p-3">
                  &nbsp;
                </th>
                <th scope="col" className="p-3">
                  Printed card
                </th>
                <th scope="col" className="p-3">
                  Digital invite on WhatsApp
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-line border-t-2">
                  <th scope="row" className="p-3 font-medium">
                    {row.label}
                  </th>
                  <td className="text-ink-soft p-3">{row.paper}</td>
                  <td className="p-3">{row.digital}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex max-w-prose flex-col gap-4">
        <h2 className="text-title">Messages to send with your invite</h2>
        <p className="text-ink-soft">
          The link carries the details; the message carries the warmth. Copy a ready message for
          family, friends or colleagues in English or Hindi, and tell your guests how to reply.
        </p>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/guides/wedding-invitation-message-whatsapp"
              className="text-ink decoration-brand inline-flex min-h-11 items-center underline decoration-2 underline-offset-4"
            >
              WhatsApp wedding invitation messages
            </Link>
          </li>
          <li>
            <Link
              href="/guides/reply-to-wedding-invitation-on-whatsapp"
              className="text-ink decoration-brand inline-flex min-h-11 items-center underline decoration-2 underline-offset-4"
            >
              How to reply to a wedding invitation on WhatsApp
            </Link>
          </li>
        </ul>
      </section>

      <FaqList faqs={LANDING_FAQS} />

      <GuideCta heading="Make your WhatsApp wedding invitation">
        Type both names and the date. Your preview comes to your WhatsApp, and you pay only if you
        like it.
      </GuideCta>
    </PageShell>
  );
}

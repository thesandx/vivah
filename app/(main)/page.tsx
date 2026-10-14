import type { Metadata } from 'next';
import Link from 'next/link';

import { PageShell } from '@/components/layout/PageShell';
import { LeadForm } from '@/components/lead/LeadForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { Card } from '@/components/ui/Card';
import { Face } from '@/components/ui/Face';
import { env } from '@/lib/env';
import { organizationSchema, siteOrigin } from '@/lib/seo';

/**
 * Home page — a Server Component. The form is the only client part.
 *
 * It is the first step of the funnel in the PRD: names, date, WhatsApp number,
 * then a private preview. On a phone the form follows a short heading, so it
 * sits in the first screen. From `lg` the words go on the left and the form on
 * the right. Same markup, same order; only the grid changes.
 */

// The title and description carry the WhatsApp keyword cluster from the PRD's
// SEO plan: "wedding invitation for whatsapp", "digital wedding invitation".
export const metadata: Metadata = {
  title: { absolute: `Online Hindu Wedding Invitation with Guest Name | ${env.appName}` },
  description:
    'A digital wedding invitation on its own link, sent on WhatsApp with each guest’s name. Type both names and see it before you pay.',
  alternates: { canonical: '/' },
};

const GUIDES = [
  { href: '/whatsapp-wedding-invitation', label: 'Wedding invitation for WhatsApp' },
  { href: '/guides/wedding-invitation-message-whatsapp', label: 'WhatsApp invitation messages' },
  {
    href: '/guides/reply-to-wedding-invitation-on-whatsapp',
    label: 'Replying to an invitation on WhatsApp',
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <JsonLd data={organizationSchema(siteOrigin(env.rootDomain, env.appUrl), env.appName)} />
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
        <header className="flex flex-col gap-5">
          <span className="bg-brand-soft border-line shadow-mochi-lg inline-grid size-20 place-items-center rounded-full border-2">
            <Face size={64} blink label="The Vivah mascot" />
          </span>
          <h1 className="text-hero">Your wedding invite, on its own link</h1>
          <p className="text-ink-soft max-w-prose">
            A digital wedding invitation that you send on WhatsApp. Type both names and the date.
            You see your invite before you pay. After you pay, it goes live at a link like
            raadha-shyam.vivah.online, and every guest gets a link with their own name.
          </p>
        </header>

        <Card as="section" className="flex flex-col gap-4">
          <h2 className="text-heading">See your invite</h2>
          <LeadForm />
        </Card>
      </div>

      <nav aria-labelledby="guides-heading" className="flex flex-col gap-3">
        <h2 id="guides-heading" className="text-heading">
          Inviting on WhatsApp
        </h2>
        <ul className="flex flex-col gap-x-6 sm:flex-row sm:flex-wrap">
          {GUIDES.map((guide) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className="text-ink decoration-brand inline-flex min-h-11 items-center underline decoration-2 underline-offset-4"
              >
                {guide.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PageShell>
  );
}

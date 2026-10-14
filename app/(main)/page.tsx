import type { Metadata } from 'next';

import { PageShell } from '@/components/layout/PageShell';
import { LeadForm } from '@/components/lead/LeadForm';
import { Card } from '@/components/ui/Card';
import { Face } from '@/components/ui/Face';

/**
 * Home page — a Server Component. The form is the only client part.
 *
 * It is the first step of the funnel in the PRD: names, date, WhatsApp number,
 * then a private preview. On a phone the form follows a short heading, so it
 * sits in the first screen. From `lg` the words go on the left and the form on
 * the right. Same markup, same order; only the grid changes.
 */

export const metadata: Metadata = {
  description:
    'Make your wedding invite a website on its own link. Type both names and see it before you pay.',
};

export default function HomePage() {
  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
        <header className="flex flex-col gap-5">
          <span className="bg-brand-soft border-line shadow-mochi-lg inline-grid size-20 place-items-center rounded-full border-2">
            <Face size={64} blink label="The Vivah mascot" />
          </span>
          <h1 className="text-hero">Your wedding invite, on its own link</h1>
          <p className="text-ink-soft max-w-prose">
            Type both names and the date. You see your invite before you pay. After you pay, it goes
            live at a link like raadha-shyam.vivah.online, ready to send to every guest on WhatsApp.
          </p>
        </header>

        <Card as="section" className="flex flex-col gap-4">
          <h2 className="text-heading">See your invite</h2>
          <LeadForm />
        </Card>
      </div>
    </PageShell>
  );
}

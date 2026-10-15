import type { Metadata } from 'next';
import Link from 'next/link';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { ContactLink } from '@/components/ui/ContactLink';
import { BUSINESS } from '@/lib/business';

/** `GET /about` — who makes vivah.online, and why. */

export const metadata: Metadata = {
  title: 'About us',
  description:
    'vivah.online makes personal wedding websites and digital invites for Indian weddings. It started with one couple’s own wedding site.',
  alternates: { canonical: '/about' },
};

const LINK = 'text-ink decoration-brand underline decoration-2 underline-offset-4';

export default function AboutPage() {
  return (
    <PolicyPage
      title="About us"
      summary={
        <p>
          {BUSINESS.brand} makes a personal wedding website for each couple, and a digital invite
          that greets every guest by name. You can make yours in about 5 minutes and see it before
          you pay.
        </p>
      }
    >
      <section>
        <h2>How it started</h2>
        <p>
          It began as the wedding website one of us made for our own wedding in Darbhanga, Bihar, in
          March 2026. Each guest got a link that opened with their own name, the date, a countdown,
          the venue on the map and a one-tap reply on WhatsApp. Friends and family asked how they
          could make one too. {BUSINESS.brand} is that site, made for every couple.
        </p>
      </section>
      <section>
        <h2>What we believe</h2>
        <ul>
          <li>An invite should feel personal, so every guest is greeted by name.</li>
          <li>It should be simple: one link on WhatsApp, nothing to install.</li>
          <li>You see exactly what you get before you pay.</li>
          <li>Your guests’ details are yours. We never sell them.</li>
        </ul>
      </section>
      <section>
        <h2>Talk to us</h2>
        <p>
          We are a small team, and a real person answers every message. Questions, ideas, or a
          wedding next week? Write to <ContactLink kind="email" value={BUSINESS.helloEmail} />, see
          the{' '}
          <Link href="/contact" className={LINK}>
            contact page
          </Link>
          , or{' '}
          <Link href="/" className={LINK}>
            make your invite now
          </Link>
          .
        </p>
      </section>
    </PolicyPage>
  );
}

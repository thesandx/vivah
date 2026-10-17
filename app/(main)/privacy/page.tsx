import type { Metadata } from 'next';
import Link from 'next/link';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';
import { BUSINESS } from '@/lib/business';

/**
 * `GET /privacy` — the privacy policy, from the PRD's "Legal and policies"
 * draft, written for India's DPDP Act 2023. Every fact about the business
 * comes from `lib/business.ts`.
 */

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What vivah.online collects to make your wedding invite, why, who else sees it, how long we keep it, and how to ask us to delete it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy policy"
      summary={
        <p>
          We collect only what we need to make your wedding invite and deliver it. We never sell
          your data. Unpaid previews are deleted after 30 days, and your invite and your guests’
          replies are deleted 12 months after your wedding date. You can ask us to see, fix or
          delete your data at any time.
        </p>
      }
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          {BUSINESS.brand} is run by a small team
          {BUSINESS.address === '' ? '' : `, at ${BUSINESS.address}`}. You can reach us using the
          details at the end of this page.
        </p>
      </section>

      <section>
        <h2>2. What we collect, why, and for how long</h2>
        <ul>
          <li>
            <strong className="text-ink">The couple’s names, wedding date, time and venue</strong>,
            to build and show your invite. Kept until 12 months after the wedding date, or 30 days
            for an unpaid preview.
          </li>
          <li>
            <strong className="text-ink">Your WhatsApp number</strong>, to send your preview and
            invite links, to sign you in to your dashboard, and to show your guests where to RSVP.
            Kept as long as your invite.
          </li>
          <li>
            <strong className="text-ink">Guest names you add to personal links</strong>, to greet
            each guest by name. Kept as long as your invite.
          </li>
          <li>
            <strong className="text-ink">Payment reference, amount and status</strong>, to confirm
            payment, handle refunds and meet tax law. Kept as long as tax law requires.
          </li>
          <li>
            <strong className="text-ink">IP address and browser type</strong>, for security and to
            stop abuse. Kept for 30 days.
          </li>
        </ul>
        <p>
          Card numbers, UPI PINs and bank details go directly to our payment provider and never
          reach our servers.
        </p>
      </section>

      <section>
        <h2>3. Who else sees your data</h2>
        <ul>
          <li>Cashfree Payments (India), which processes payments.</li>
          <li>Google Cloud (Mumbai region), which hosts the site and the database.</li>
          <li>Cloudflare, which delivers pages quickly and protects against attacks.</li>
          <li>Google Firebase, which sends the one-time code you sign in with.</li>
          <li>Meta (WhatsApp Business), which delivers our WhatsApp messages to you.</li>
          <li>
            Telegram, which tells our team that you made a preview. It gets your names and wedding
            date, never your number.
          </li>
          <li>
            Your guests: anyone with your invite link can see your invite. Do not put anything on it
            you would not want shared.
          </li>
          <li>Authorities, only when the law requires it.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data outside India</h2>
        <p>
          Cloudflare, Meta and Telegram may process data outside India. We rely on transfers the
          DPDP Act permits.
        </p>
      </section>

      <section>
        <h2>5. Your rights</h2>
        <p>
          You can ask to see, correct or delete your data, withdraw consent for messages, raise a
          grievance, and name someone to act for you. Write to us with your invite link or payment
          reference. We may have to keep tax records even after a deletion request.
        </p>
      </section>

      <section>
        <h2>6. Guests</h2>
        <p>
          If you reply to an invite, the couple who made it sees your reply. To have it removed, ask
          the couple or write to us.
        </p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>
          The service is for adults. Do not enter information about children beyond a headcount.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Data is encrypted in transit and at rest. Each part of the system can reach only what it
          needs, and backups are kept for 7 days.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          We set one cookie to keep you signed in to your dashboard, and one to keep your preview on
          the phone that opened it. We do not use advertising or analytics cookies today. If we add
          them, we will ask you first. Invite pages your guests open set no cookies.
        </p>
      </section>

      <section>
        <h2>10. Complaints</h2>
        <p>
          Our team handles complaints about your data. We acknowledge within 48 hours and resolve
          within 30 days. If we do not resolve it, you may complain to the Data Protection Board of
          India.
        </p>
        <SupportContacts />
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We post changes here with a new date, and tell paying customers on WhatsApp about
          important ones. See also our{' '}
          <Link href="/terms" className="text-ink decoration-brand underline decoration-2">
            terms
          </Link>
          .
        </p>
      </section>
    </PolicyPage>
  );
}

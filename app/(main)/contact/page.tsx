import type { Metadata } from 'next';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';
import { ContactLink } from '@/components/ui/ContactLink';
import { BUSINESS } from '@/lib/business';

/**
 * `GET /contact` — how to reach us, the "paid but no link" help, and the
 * grievance officer the consumer rules ask every Indian shop to name.
 */

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Talk to vivah.online on WhatsApp, phone or email. Help with payments, your invite link, refunds and complaints.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <PolicyPage
      title="Contact us"
      summary={
        <p>
          WhatsApp is the fastest way to reach us. If your wedding is within 48 hours, start your
          message with URGENT and we answer it first.
        </p>
      }
    >
      <section>
        <h2>Talk to us</h2>
        <SupportContacts />
      </section>
      <section>
        <h2>Paid, but no link?</h2>
        <p>Do not pay again. Send us your UPI reference, and we send your link or refund you.</p>
      </section>
      <section>
        <h2>Report an invite</h2>
        <p>
          If an invite is abusive, uses your photo without permission, or pretends to be someone,
          send us its link. We act within 72 hours of a valid complaint.
        </p>
      </section>
      <section>
        <h2>Complaints</h2>
        <p>
          Email <ContactLink kind="email" value={BUSINESS.email} /> with what went wrong
          {BUSINESS.address === '' ? '' : `, or write to ${BUSINESS.address}`}. We are a small team,
          and we handle every complaint ourselves. We acknowledge it within 48 hours and resolve it
          within 30 days.
        </p>
      </section>
    </PolicyPage>
  );
}

import type { Metadata } from 'next';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';

/** `GET /delivery-policy` — how a digital invite is delivered. Nothing ships. */

export const metadata: Metadata = {
  title: 'Delivery policy',
  description:
    'vivah.online ships nothing physical. Your invite link appears on screen within seconds of payment.',
  alternates: { canonical: '/delivery-policy' },
};

export default function DeliveryPolicyPage() {
  return (
    <PolicyPage
      title="Delivery policy"
      summary={<p>Nothing is shipped. Your invite is a web page, delivered as a link.</p>}
    >
      <section>
        <h2>How you receive your invite</h2>
        <p>
          After payment, your invite link appears on screen within seconds, and you can share it at
          once. You can change its details any time from your dashboard.
        </p>
      </section>
      <section>
        <h2>Paid, but no link?</h2>
        <p>
          Do not pay again. If you do not see your link within 10 minutes, send us your UPI
          reference. We send the link by hand, or refund you.
        </p>
        <SupportContacts />
      </section>
    </PolicyPage>
  );
}

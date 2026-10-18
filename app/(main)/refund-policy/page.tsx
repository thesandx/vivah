import type { Metadata } from 'next';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';

/** `GET /refund-policy` — refunds and cancellation, from the PRD's draft. */

export const metadata: Metadata = {
  title: 'Refund and cancellation policy',
  description:
    'When vivah.online refunds you, how to cancel, and how long a refund takes to reach your bank.',
  alternates: { canonical: '/refund-policy' },
};

const CASES: ReadonlyArray<{ situation: string; refund: string }> = [
  { situation: 'Charged twice, or charged but no invite link received', refund: 'Full refund' },
  {
    situation: 'Our site was down or broken and you could not use the invite in time',
    refund: 'Full refund',
  },
  { situation: 'You paid, then changed your mind', refund: 'No refund' },
  {
    situation: 'Wedding postponed or cancelled',
    refund: 'No refund; we change the date for you, free, once',
  },
  { situation: 'A spelling or a detail entered wrongly', refund: 'No refund; edit it any time' },
];

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refund and cancellation policy"
      summary={
        <p>
          You see your invite before you pay, so we do not refund a change of mind. If something
          goes wrong on our side, you get your money back.
        </p>
      }
    >
      <section>
        <h2>When we refund</h2>
        <ul>
          {CASES.map((item) => (
            <li key={item.situation}>
              {item.situation}: <strong className="text-ink">{item.refund}</strong>.
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>How to ask</h2>
        <p>
          Send us your UPI reference or your invite link. We reply within 48 hours. An approved
          refund goes back to the original payment method within 5 to 7 working days, depending on
          your bank.
        </p>
        <SupportContacts />
      </section>
    </PolicyPage>
  );
}

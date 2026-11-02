import type { Metadata } from 'next';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';
import { MONEY_BACK_DAYS } from '@/lib/business';

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
  {
    situation: `You do not like your invite, and you ask within ${MONEY_BACK_DAYS} days of paying`,
    refund: 'Full refund, for any reason',
  },
  {
    situation: `You change your mind more than ${MONEY_BACK_DAYS} days after paying`,
    refund: 'No refund',
  },
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
          Do not like your invite? Ask within {MONEY_BACK_DAYS} days of paying and we refund you in
          full, for any reason. If something goes wrong on our side, you get your money back at any
          time.
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
          Send us your UPI reference or your invite link. We reply within 48 hours. When we refund a
          change of mind, we take your invite offline on the same day. An approved refund goes back
          to the original payment method within 5 to 7 working days, depending on your bank.
        </p>
        <SupportContacts />
      </section>
    </PolicyPage>
  );
}

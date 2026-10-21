import type { Metadata } from 'next';
import Link from 'next/link';

import { PolicyPage } from '@/components/legal/PolicyPage';
import { SupportContacts } from '@/components/legal/SupportContacts';
import { BUSINESS } from '@/lib/business';

/** `GET /terms` — the terms of service, from the PRD's "Legal and policies" draft. */

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The agreement between you and vivah.online: what we make, who can use it, your content, payment, refunds, and how long your invite stays live.',
  alternates: { canonical: '/terms' },
};

const LINK = 'text-ink decoration-brand underline decoration-2 underline-offset-4';

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of service"
      summary={
        <p>
          You see your invite before you pay. You pay once to publish it at its own link and send it
          to your guests. You own what you add; we keep it online and safe. Be fair to your guests
          and to others.
        </p>
      }
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          These terms are an agreement between you and {BUSINESS.brand}, a small team that makes
          wedding invite websites{BUSINESS.address === '' ? '' : `, at ${BUSINESS.address}`}.
        </p>
      </section>
      <section>
        <h2>2. The service</h2>
        <p>
          We make personal wedding invite websites. You enter your details, see a free preview, and
          pay once to publish your invite at its own link, such as raadha-shyam.vivah.online. You
          can then send personal links to your guests.
        </p>
      </section>
      <section>
        <h2>3. Who can use it</h2>
        <p>You must be 18 or older and able to make a payment in India.</p>
      </section>
      <section>
        <h2>4. Your account</h2>
        <p>
          You sign in with a one-time code sent to the phone number you paid with. Keep that number
          secure: anyone who can read its messages can edit your invite.
        </p>
      </section>
      <section>
        <h2>5. Your content</h2>
        <p>
          You keep ownership of everything you add. You let us store and display it only to provide
          the service. You confirm you have the right to use every photo and name you add, and that
          nothing is unlawful, hateful, obscene, or breaks anyone’s rights.
        </p>
      </section>
      <section>
        <h2>6. Fair use</h2>
        <p>
          Use the service only for a real event invitation. Do not impersonate anyone, collect
          guests’ data for other purposes, or disrupt or copy the platform.
        </p>
      </section>
      <section>
        <h2>7. Prices and payment</h2>
        <p>
          We show the price before you pay, including GST where it applies. Cashfree Payments or
          Razorpay processes payments. A price change never affects an invite you have already paid
          for.
        </p>
      </section>
      <section>
        <h2>8. How long your invite stays live</h2>
        <p>
          Your invite stays online until 12 months after your wedding date. After that we delete it,
          unless you ask us to keep it longer.
        </p>
      </section>
      <section>
        <h2>9. Refunds</h2>
        <p>
          See the{' '}
          <Link href="/refund-policy" className={LINK}>
            refund and cancellation policy
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>10. Our content</h2>
        <p>
          The designs, illustrations, code and the {BUSINESS.brand} name belong to us. You may share
          your invite link freely, but not copy our designs for other uses.
        </p>
      </section>
      <section>
        <h2>11. Availability</h2>
        <p>
          We work hard to keep invites online, most of all near wedding dates, but we cannot promise
          uninterrupted service. Keep another way to reach important guests.
        </p>
      </section>
      <section>
        <h2>12. Liability</h2>
        <p>
          As far as the law allows, our total liability for any claim is the amount you paid for
          that invite. We are not liable for indirect losses, or for problems caused by your
          content, your guests, WhatsApp, or your phone or internet.
        </p>
      </section>
      <section>
        <h2>13. Suspension</h2>
        <p>
          We may take down an invite that breaks these terms or the law, and we will tell you why.
          If we remove an invite and you did nothing wrong, we refund you.
        </p>
      </section>
      <section>
        <h2>14. Complaints</h2>
        <p>
          Write to us. We acknowledge within 48 hours and aim to resolve within 30 days. See the{' '}
          <Link href="/contact" className={LINK}>
            contact page
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>15. Changes</h2>
        <p>
          We announce important changes on the site at least 7 days before they apply. A change
          never reduces what you have already paid for.
        </p>
      </section>
      <section>
        <h2>16. Law</h2>
        <p>
          Indian law applies. This does not affect your right to approach a consumer commission.
        </p>
        <SupportContacts />
      </section>
    </PolicyPage>
  );
}

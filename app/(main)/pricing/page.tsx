import type { Metadata } from 'next';
import Link from 'next/link';

import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS, PLAN_PRICES_RUPEES, whatsAppChatUrl } from '@/lib/business';
import { SHARE_IMAGE } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * `GET /pricing` — the two plans, both paid once. A Server Component.
 *
 * Basic is what the pay button on the preview page sells. Premium is Basic
 * without the "Made with ♥ by vivah.online" line; it has no checkout yet, so
 * its button opens a WhatsApp chat, and the admin hides the line from
 * `/admin` (`hideCredit`) once the couple pays. The terms (section 8) say the
 * line shows by default.
 *
 * List only what the invite does today. Do not add a perk that is not built.
 */

const TITLE = 'Pricing: Basic ₹799 and Premium ₹1,299, one-time';
const DESCRIPTION =
  'Simple, one-time pricing for your wedding website and digital invites. Basic has every feature. Premium also removes the vivah.online line from your invite. No charge per guest.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/pricing', images: [SHARE_IMAGE] },
};

const LINK = 'text-ink decoration-brand underline decoration-2 underline-offset-4';

const UPGRADE_DIFFERENCE = PLAN_PRICES_RUPEES.premium - PLAN_PRICES_RUPEES.basic;

function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const BASIC_FEATURES = [
  'Your own link, like priya-rahul.vivah.online',
  'A personal link for every guest, opening with their name',
  'All your functions, with maps and a live countdown',
  'RSVP on WhatsApp in one tap',
  'Ganesh opening card, your song and scratch-to-reveal date',
  'Edit any time from your dashboard',
  `Small “Made with ♥ by ${BUSINESS.brand}” line at the end`,
];

const PREMIUM_FEATURES = [
  'Everything in Basic',
  `No “Made with ♥ by ${BUSINESS.brand}” line on your invite`,
  `Upgrade from Basic any time for the ${rupees(UPGRADE_DIFFERENCE)} difference`,
];

const PREMIUM_MESSAGE = `Namaste Vivah team! 🙏 We would like the Premium plan (${rupees(PLAN_PRICES_RUPEES.premium)}) for our wedding invite.`;

function Tick() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 size-5 shrink-0">
      <circle cx="10" cy="10" r="10" className="fill-brand-soft" />
      <path
        d="m6 10.5 2.6 2.5L14 7.5"
        className="stroke-ink fill-none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PlanCardProps {
  id: string;
  name: string;
  price: number;
  features: readonly string[];
  badge?: string;
  highlighted?: boolean;
  children: React.ReactNode;
}

function PlanCard({ id, name, price, features, badge, highlighted, children }: PlanCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'bg-surface rounded-card flex flex-col gap-5 border-2 p-5 sm:p-6',
        highlighted === true ? 'border-brand shadow-hard-lg' : 'border-line shadow-hard',
      )}
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id={id} className="text-title">
            {name}
          </h2>
          {badge !== undefined && <Badge tone="brand">{badge}</Badge>}
        </div>
        <p className="flex items-baseline gap-2">
          <span className="text-hero font-display">{rupees(price)}</span>
          <span className="text-ink-soft">one-time</span>
        </p>
      </header>
      <ul className="flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Tick />
            {feature}
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}

export default function PricingPage() {
  return (
    <PageShell className="gap-10 sm:gap-12">
      <header className="flex flex-col gap-4 text-center sm:items-center">
        <h1 className="text-hero">Simple, one-time pricing</h1>
        <p className="text-heading text-ink-soft max-w-prose font-normal">
          Pay once, invite every guest. No charge per guest, and you see your whole invite free
          before you pay.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <PlanCard
          id="plan-basic"
          name="Basic"
          price={PLAN_PRICES_RUPEES.basic}
          features={BASIC_FEATURES}
        >
          <Link href="/#start" className={buttonStyles({ block: true })}>
            Start your invite
          </Link>
        </PlanCard>
        <PlanCard
          id="plan-premium"
          name="Premium"
          price={PLAN_PRICES_RUPEES.premium}
          features={PREMIUM_FEATURES}
          badge="No branding"
          highlighted
        >
          <a
            href={whatsAppChatUrl(BUSINESS.whatsAppE164, PREMIUM_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ variant: 'secondary', block: true })}
          >
            <WhatsAppIcon />
            Get Premium on WhatsApp
          </a>
        </PlanCard>
      </div>

      <section aria-labelledby="pricing-notes" className="flex max-w-prose flex-col gap-3">
        <h2 id="pricing-notes" className="text-title">
          Good to know
        </h2>
        <ul className="text-ink-soft flex flex-col gap-2 [&_li]:ml-5 [&_li]:list-disc">
          <li>
            Start with the free preview. When you love it, pay {rupees(PLAN_PRICES_RUPEES.basic)} to
            make it live on Basic.
          </li>
          <li>
            For Premium, message us on WhatsApp. We hide the {BUSINESS.brand} line as soon as your
            payment reaches us.
          </li>
          <li>
            Already on Basic? Upgrade any time and pay only the {rupees(UPGRADE_DIFFERENCE)}{' '}
            difference.
          </li>
          <li>
            See the{' '}
            <Link href="/terms" className={LINK}>
              terms
            </Link>{' '}
            and the{' '}
            <Link href="/refund-policy" className={LINK}>
              refund policy
            </Link>
            .
          </li>
        </ul>
      </section>
    </PageShell>
  );
}

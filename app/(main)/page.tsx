import type { Metadata } from 'next';
import Link from 'next/link';

import { ChatShotCard } from '@/components/home/ChatShotCard';
import { DemoVideo } from '@/components/home/DemoVideo';
import { FeatureList } from '@/components/home/FeatureList';
import { GuestPreview } from '@/components/home/GuestPreview';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PaperVsDigital } from '@/components/home/PaperVsDigital';
import { ReviewCard } from '@/components/home/ReviewCard';
import { PageShell } from '@/components/layout/PageShell';
import { LeadForm } from '@/components/lead/LeadForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Marquee } from '@/components/ui/Marquee';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { DEMO_STEPS, DEMO_VIDEO } from '@/lib/demo-video';
import { env } from '@/lib/env';
import { organizationSchema, siteOrigin } from '@/lib/seo';
import { CHAT_SHOTS, REVIEWS } from '@/lib/testimonials';
import { cn } from '@/lib/utils';

/**
 * Home page — a Server Component. The form is the only client part.
 *
 * It is the first page a couple sees, so it sells first: the promise (a
 * wedding website in 5 minutes), the form, then what guests get, as a grid of
 * tiles with a demo video. Two slow carousels hold reviews and chat screenshots from couples;
 * until real ones arrive they show open slots that claim nothing. See
 * `lib/testimonials.ts`.
 *
 * On a phone the form follows the heading, so it sits near the first screen.
 * From `lg` the words go on the left and the form on the right.
 */

// The title and description carry the WhatsApp keyword cluster from the PRD's
// SEO plan: "wedding invitation for whatsapp", "digital wedding invitation".
export const metadata: Metadata = {
  title: {
    absolute: `Wedding Website and Digital Invitation with Guest Name | ${env.appName}`,
  },
  description:
    'Create your personal wedding website in 5 minutes. Send a digital wedding invitation on WhatsApp, with each guest’s name. See it free before you pay.',
  alternates: { canonical: '/' },
};

/** The form's anchor, for the buttons further down the page. */
const FORM_ID = 'start';

const PROMISES = [
  'Each guest sees their own name',
  'Opens from WhatsApp, with no app to install',
  'See it free before you pay',
];

const GUIDES = [
  { href: '/whatsapp-wedding-invitation', label: 'Wedding invitation for WhatsApp' },
  { href: '/guides/wedding-invitation-message-whatsapp', label: 'WhatsApp invitation messages' },
  {
    href: '/guides/reply-to-wedding-invitation-on-whatsapp',
    label: 'Replying to an invitation on WhatsApp',
  },
];

function Tick() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
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

/** A section's heading, with a small line above it. */
function SectionHeading({ id, eyebrow, title, intro }: Record<string, string>) {
  return (
    <header className="flex max-w-prose flex-col gap-3">
      <p className="text-small text-ink-soft font-semibold tracking-widest uppercase">{eyebrow}</p>
      <h2 id={id} className="text-title">
        {title}
      </h2>
      <p className="text-ink-soft">{intro}</p>
    </header>
  );
}

export default function HomePage() {
  const chatUrl = whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO);

  return (
    <PageShell>
      <JsonLd data={organizationSchema(siteOrigin(env.rootDomain, env.appUrl), env.appName)} />

      {/* The hero. Three grid items, so a phone gets words, form, promises,
          and a desktop gets the form beside the words. */}
      <section
        aria-labelledby="hero-heading"
        className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-x-12"
      >
        <div className="flex flex-col gap-5 lg:col-start-1 lg:self-end">
          <p className="bg-brand-soft rounded-pill text-small self-start px-4 py-1.5 font-semibold">
            Wedding websites and digital invites
          </p>
          <h1 id="hero-heading" className="text-hero">
            Create your personal wedding website in{' '}
            <span className="font-script decoration-butter whitespace-nowrap underline decoration-4 underline-offset-8">
              5 minutes
            </span>
          </h1>
          <p className="text-heading text-ink-soft max-w-prose font-normal">
            Get your personal wedding site and send personalised digital invites to friends and
            family.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <p className="text-heading text-center">See it free, and pay only when you love it.</p>
          <Card as="section" className="shadow-hard-lg flex scroll-mt-24 flex-col gap-4">
            <LeadForm headingId={FORM_ID} />
          </Card>
        </div>

        <ul className="flex flex-col gap-3 lg:col-start-1 lg:self-start">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex items-center gap-3">
              <Tick />
              {promise}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="board-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <SectionHeading
            id="board-heading"
            eyebrow="What your guests see"
            title="Everything about your wedding, on one link"
            intro="Your invite, the countdown, the venue map and a WhatsApp RSVP. Every guest opens it with their own name on it."
          />
          <DemoVideo sources={DEMO_VIDEO.sources} poster={DEMO_VIDEO.poster} steps={DEMO_STEPS} />
        </div>
        <GuestPreview />
      </section>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-8">
        <SectionHeading
          id="steps-heading"
          eyebrow="How it works"
          title="Three steps to your wedding website"
          intro="No designer, no app and no waiting. You do it from your phone."
        />
        <HowItWorks />
      </section>

      <section aria-labelledby="features-heading" className="flex flex-col gap-8">
        <SectionHeading
          id="features-heading"
          eyebrow="Everything included"
          title="Made for Indian weddings"
          intro="Everything your guests need, in one invite that opens on any phone."
        />
        <FeatureList />
      </section>

      <section aria-labelledby="compare-heading" className="flex flex-col gap-8">
        <SectionHeading
          id="compare-heading"
          eyebrow="Why go digital?"
          title="Paper cards or a wedding website"
          intro="Keep the printed card for the elders if you like. Send everyone else a link."
        />
        <PaperVsDigital />
      </section>

      <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
        <SectionHeading
          id="reviews-heading"
          eyebrow="Love notes"
          title="From our couples"
          intro="We are new. As our first couples celebrate, their words will fill these cards."
        />
        <Marquee
          label="Reviews from couples"
          className="-mx-5 sm:-mx-8"
          items={REVIEWS.map((review) => ({
            key: review.id,
            node: <ReviewCard review={review} />,
          }))}
        />
      </section>

      <section aria-labelledby="chats-heading" className="flex flex-col gap-6">
        <SectionHeading
          id="chats-heading"
          eyebrow="In the chats"
          title="What the family group says"
          intro="Screenshots of the messages our couples get on WhatsApp and Instagram, shared with their permission."
        />
        <Marquee
          label="Messages couples received"
          reverse
          className="-mx-5 sm:-mx-8"
          items={CHAT_SHOTS.map((chat, index) => ({
            key: chat.id,
            node: <ChatShotCard chat={chat} tilt={index % 2 === 0 ? 'left' : 'right'} />,
          }))}
        />
      </section>

      <section
        aria-labelledby="cta-heading"
        className="bg-brand-soft rounded-sheet flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12"
      >
        <h2 id="cta-heading" className="text-title max-w-prose">
          Your wedding deserves its own website
        </h2>
        <p className="text-ink-soft max-w-prose">
          Start with both names. Your invite is ready to see in 5 minutes.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a href={`#${FORM_ID}`} className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            Create my wedding website
          </a>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonStyles({ variant: 'secondary', size: 'lg' }), 'gap-2')}
          >
            <WhatsAppIcon />
            Ask us on WhatsApp
          </a>
        </div>
      </section>

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

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { HomeTestimonials } from '@/app/(main)/home-testimonials';
import { DemoVideo } from '@/components/home/DemoVideo';
import { FeatureList } from '@/components/home/FeatureList';
import { GuestPreview } from '@/components/home/GuestPreview';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PaperVsDigital } from '@/components/home/PaperVsDigital';
import { SectionHeading } from '@/components/home/SectionHeading';
import { PageShell } from '@/components/layout/PageShell';
import { LeadForm } from '@/components/lead/LeadForm';
import { SectionCta } from '@/components/lead/SectionCta';
import { SignupButton } from '@/components/lead/SignupButton';
import { SignupDialogProvider } from '@/components/lead/SignupDialogProvider';
import { StickySignupBar } from '@/components/lead/StickySignupBar';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { DEMO_STEPS, DEMO_VIDEO } from '@/lib/demo-video';
import { env } from '@/lib/env';
import { organizationSchema, siteOrigin } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * Home page — a Server Component. The form is the only client part.
 *
 * It is the first page a couple sees, so it sells first: the promise (a
 * wedding website in 5 minutes), the form, then what guests get, as a grid of
 * tiles with a demo video. Near the end, a banner and two drifting rows hold
 * what couples say, which the admin adds from `/admin`
 * (`app/(main)/home-testimonials.tsx`).
 *
 * It renders on each request, because the admin's changes must show without
 * a deploy. The testimonials stream in behind a `Suspense`, so the rest of
 * the page never waits on Firestore.
 *
 * On a phone the form follows the heading, so it sits near the first screen.
 * From `lg` the words go on the left and the form on the right.
 *
 * Below the hero, each section ends with its own invitation (`SectionCta`),
 * and a sticky bar appears once the visitor scrolls past the form. Both open
 * the same sign-up card in a dialog, after a red thread ties a heart, rather
 * than scrolling back up. The product owner asked for a call to action after
 * every section, so this page is the exception to the anti-slop rule about
 * repeating the primary call to action.
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

/** The hero form's heading. */
const FORM_ID = 'start';
/** The hero's sign-up card: the sticky bar shows once the visitor scrolls past it. */
const SIGNUP_CARD_ID = 'signup-card';

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

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const chatUrl = whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO);

  return (
    <PageShell>
      <SignupDialogProvider>
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

          <div
            id={SIGNUP_CARD_ID}
            className="flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
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
          <SectionCta
            line="Picture every guest opening your love story, with their own name on it."
            action="Write our love story"
          />
        </section>

        <section aria-labelledby="steps-heading" className="flex flex-col gap-8">
          <SectionHeading
            id="steps-heading"
            eyebrow="How it works"
            title="Three steps to your wedding website"
            intro="No designer, no app and no waiting. You do it from your phone."
          />
          <HowItWorks />
          <SectionCta
            line="Three steps tonight. A lifetime of “remember when”."
            action="Begin our forever"
          />
        </section>

        <section aria-labelledby="features-heading" className="flex flex-col gap-8">
          <SectionHeading
            id="features-heading"
            eyebrow="Everything included"
            title="Made for Indian weddings"
            intro="Everything your guests need, in one invite that opens on any phone."
          />
          <FeatureList />
          <SectionCta
            line="From the haldi to the vidaai, every moment deserves a home."
            action="Give our wedding a home"
          />
        </section>

        <section aria-labelledby="compare-heading" className="flex flex-col gap-8">
          <SectionHeading
            id="compare-heading"
            eyebrow="Why go digital?"
            title="Paper cards or a wedding website"
            intro="Keep the printed card for the elders if you like. Send everyone else a link."
          />
          <PaperVsDigital />
          <SectionCta
            line="Paper cards fade. Your love story stays one tap away."
            action="Make our invite timeless"
          />
        </section>

        {/* Streams in after the rest of the page, so a slow read never holds
          the page back. */}
        <Suspense fallback={null}>
          <HomeTestimonials />
        </Suspense>

        <section
          aria-labelledby="cta-heading"
          className="bg-brand-soft rounded-sheet flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-12"
        >
          <h2 id="cta-heading" className="text-title max-w-prose">
            Your love story deserves its own website
          </h2>
          <p className="text-ink-soft max-w-prose">
            Two names and five minutes. See it free, fall in love with it, and pay only then.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <SignupButton>Show us our wedding website</SignupButton>
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

        <StickySignupBar
          afterId={SIGNUP_CARD_ID}
          line="Your forever starts with two names."
          action="Begin our love story"
        />
      </SignupDialogProvider>
    </PageShell>
  );
}

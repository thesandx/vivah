import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { HelpHowTo } from '@/app/(main)/help/help-how-to';
import { FaqList } from '@/components/guides/FaqList';
import { type HowTo, HowToSection } from '@/components/help/HowToSection';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonStyles } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import type { SiteVideoSlot } from '@/lib/demo-video';
import { faqPageSchema, PRODUCT_FAQS, SHARE_IMAGE } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { WHATSAPP_CHAT_PATH } from '@/lib/whatsapp-hello';

/**
 * `GET /help` — the "Help" tab. Three how-tos for a couple whose site is live,
 * each with its walkthrough video, then the questions couples ask, then the
 * way to `/contact`.
 *
 * The steps name the buttons exactly as the dashboard shows them
 * (`components/dashboard/WeddingDetailsForm.tsx`, `FunctionsForm.tsx`,
 * `GuestLinks.tsx`) and the
 * sign-in screens (`components/auth/SignInPanel.tsx`). Change them together.
 *
 * The admin uploads each video from the Home page tab of `/admin`, like the
 * home page's demo (`services/demo-video.service.ts`). With no video, the
 * how-to shows its steps alone. The page renders on each request, so a new
 * upload shows without a deploy.
 */

const TITLE = 'Help: edit your wedding details, add functions and send guest invites';
const DESCRIPTION =
  'How to change your wedding time, venue and map in your vivah.online dashboard, add your haldi, mehndi, sangeet and other functions, make a personal invite link for each guest and send it on WhatsApp, and answers to common questions.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/help' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/help', images: [SHARE_IMAGE] },
};

const LINK = 'text-ink decoration-brand underline decoration-2 underline-offset-4';

/** How a couple reaches the dashboard. Both how-tos start with it. */
const SIGN_IN_STEPS = [
  'Open vivah.online on your phone. Tap Menu, then “My site”. On a computer, “My site” is at the top of the page.',
  'Type the phone number that your personal link came to, then tap “Send OTP”.',
  'Type the 6-digit OTP from the SMS, then tap “Verify OTP”. Your dashboard opens.',
];

const EDIT_STEPS = [
  ...SIGN_IN_STEPS,
  'Find “Your details” and tap “Edit details”.',
  'Change what you need: the wedding date, the ceremony time, the venue name (for example, The Grand Pavilion, Chhatarpur) and the town and state (for example, New Delhi, Delhi). The ceremony time is India time, and the countdown runs to it.',
  'To add the map, open Google Maps and search for your venue. Tap Share, then “Copy link”. Come back and paste the link in “Google Maps link”.',
  'Tap “Save details”. When you see “Saved”, your guests see the new details. Tap “Open your invite” to check.',
];

/** Haldi is the example. Each function has the same four fields. */
const FUNCTION_STEPS = [
  ...SIGN_IN_STEPS,
  'Find “Your functions” and tap “Add functions”. If you chose functions when you signed up, the button says “Edit functions”.',
  'Tick Haldi. Four fields open below it.',
  'Choose the date and type the time. The time is India time.',
  'Type the venue, for example “The Grand Pavilion Lawns, Chhatarpur”.',
  'To add the map, open Google Maps and search for the haldi venue. Tap Share, then “Copy link”. Come back and paste the link in “Google Maps link”.',
  'Tap “Save functions”. When you see “Saved”, your invite shows Haldi in “Wedding Festivities”, with its own date, time and map. Tap “Open your invite” to check.',
];

const INVITE_STEPS = [
  ...SIGN_IN_STEPS,
  'Find “Guest invite links”.',
  'In “Guest’s name”, type the name the way you call them, for example “Vinita Didi” or “Sharma Uncle”. The invite opens with “Hi” and this name.',
  'Tap “Make link”. The link appears in the list below the form.',
  'Tap “Send on WhatsApp”. WhatsApp opens with a message ready: an invitation from the two of you, with the link at the end.',
  'Choose the guest’s chat and tap send. They see a preview with your names, and their own name when they open it.',
  'Do the same for each guest. The form is empty again after each link.',
];

const HOW_TOS: readonly (HowTo & { slot: SiteVideoSlot })[] = [
  {
    id: 'edit-details',
    eyebrow: 'Your details',
    title: 'Change the time, venue or map',
    intro:
      'Change your details as often as you need. Your web address stays the same, so the links you already sent keep working and show the new details.',
    steps: EDIT_STEPS,
    slot: 'help-edit-details',
    videoLabel: 'Video: change your wedding details in the dashboard',
    tips: [
      'On your live invite, the “Your wedding? Edit details” link at the bottom also takes you to your dashboard.',
      'Tap Cancel to leave without a change.',
    ],
  },
  {
    id: 'functions',
    eyebrow: 'Your functions',
    title: 'Add your haldi, mehndi and other functions',
    intro:
      'Your invite can show tilak, haldi, mehndi, sangeet and reception with the wedding, each with its own date, time, venue and map. The steps below add haldi. The steps are the same for every function: tick its name and fill in its fields.',
    steps: FUNCTION_STEPS,
    slot: 'help-functions',
    videoLabel: 'Video: add the haldi to your invite in the dashboard',
    tips: [
      'To add more than one function, tick each one and fill in its fields, then tap “Save functions” once.',
      'Your invite lists the functions in date order. If you change a date, the function moves to its new place.',
      'Do not know a detail yet? Leave it empty and add it later. Your link stays the same.',
      'To remove a function, tap “Edit functions”, untick it, then tap “Save functions”.',
    ],
  },
  {
    id: 'guest-invites',
    eyebrow: 'Personal invites',
    title: 'Make and send a personal invite for each guest',
    intro:
      'Each guest gets their own link. It opens your invite with Shri Ganesh and “Hi” with their name, then your song, the date, the venue map and the RSVP.',
    steps: INVITE_STEPS,
    slot: 'help-guest-invite',
    videoLabel: 'Video: make a guest link and send it on WhatsApp',
    tips: [
      'To send a link another way, tap “Copy link” and paste it in an SMS or an email.',
      'Made a link by mistake? Tap Delete next to it. If that guest opens the old link, they see your invite without their name. You cannot get a deleted link back.',
      'If the preview has no picture on WhatsApp, see the question about link previews below.',
    ],
  },
];

export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const chatUrl = WHATSAPP_CHAT_PATH;

  return (
    <PageShell>
      <JsonLd data={faqPageSchema(PRODUCT_FAQS)} />

      <header className="flex max-w-prose flex-col gap-5">
        <h1 className="text-hero">How can we help?</h1>
        <p className="text-ink-soft">
          Your dashboard is where you change your wedding details, add your functions and make an
          invite for each guest. Sign in at vivah.online/dashboard with the phone number that your
          personal link came to. Each step below names the button you tap.
        </p>
        <nav aria-label="On this page">
          <ul className="flex flex-col gap-x-6 sm:flex-row sm:flex-wrap">
            {HOW_TOS.map((howTo) => (
              <li key={howTo.id}>
                <a href={`#${howTo.id}`} className={cn(LINK, 'inline-flex min-h-11 items-center')}>
                  {howTo.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#faq" className={cn(LINK, 'inline-flex min-h-11 items-center')}>
                Questions couples ask
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {HOW_TOS.map((howTo) => (
        // The steps show at once; the video joins them when its URL arrives.
        <Suspense key={howTo.id} fallback={<HowToSection howTo={howTo} video={null} />}>
          <HelpHowTo howTo={howTo} slot={howTo.slot} />
        </Suspense>
      ))}

      <div className="scroll-mt-24" id="faq">
        <FaqList faqs={PRODUCT_FAQS} heading="Questions couples ask" />
      </div>

      <section
        aria-labelledby="still-heading"
        className="bg-brand-soft rounded-sheet flex flex-col gap-4 px-6 py-10 sm:px-12"
      >
        <h2 id="still-heading" className="text-title">
          Still need help?
        </h2>
        <p className="text-ink-soft max-w-prose">
          We are a small team, and we answer every message ourselves. WhatsApp is the fastest. If
          your wedding is within 48 hours, start your message with URGENT.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonStyles({ variant: 'primary', size: 'lg' }), 'gap-2')}
          >
            <WhatsAppIcon />
            Ask us on WhatsApp
          </a>
          <Link href="/contact" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            All the ways to contact us
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

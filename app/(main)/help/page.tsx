import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqList } from '@/components/guides/FaqList';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonStyles } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { faqPageSchema, PRODUCT_FAQS, SHARE_IMAGE } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * `GET /help` — the "Help" tab. Two how-tos for a couple whose site is live,
 * each with its walkthrough video, then the questions couples ask, then the
 * way to `/contact`.
 *
 * The steps name the buttons exactly as the dashboard shows them
 * (`components/dashboard/WeddingDetailsForm.tsx`, `GuestLinks.tsx`) and the
 * sign-in screens (`components/auth/SignInPanel.tsx`). Change them together.
 *
 * The videos are static files in `public/help/`, with `preload="none"`: the
 * page loads only the posters until the visitor presses play. They are the
 * tutorial videos the team sends a couple on WhatsApp, re-encoded for the web.
 * Re-record them when the dashboard or the sign-in screens change.
 */

const TITLE = 'Help: edit your wedding details and send guest invites';
const DESCRIPTION =
  'How to change your wedding time, venue and map in your vivah.online dashboard, how to make a personal invite link for each guest and send it on WhatsApp, and answers to common questions.';

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

const INVITE_STEPS = [
  ...SIGN_IN_STEPS,
  'Find “Guest invite links”.',
  'In “Guest’s name”, type the name the way you call them, for example “Vinita Didi” or “Sharma Uncle”. The invite opens with “Hi” and this name.',
  'Tap “Make link”. The link appears in the list below the form.',
  'Tap “Send on WhatsApp”. WhatsApp opens with a message ready: an invitation from the two of you, with the link at the end.',
  'Choose the guest’s chat and tap send. They see a preview with your names, and their own name when they open it.',
  'Do the same for each guest. The form is empty again after each link.',
];

interface HowTo {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  steps: readonly string[];
  video: { src: string; poster: string; label: string };
  tips: readonly string[];
}

const HOW_TOS: readonly HowTo[] = [
  {
    id: 'edit-details',
    eyebrow: 'Your details',
    title: 'Change the time, venue or map',
    intro:
      'Change your details as often as you need. Your web address stays the same, so the links you already sent keep working and show the new details.',
    steps: EDIT_STEPS,
    video: {
      src: '/help/edit-your-details.mp4',
      poster: '/help/edit-your-details.webp',
      label: 'Video: change your wedding details in the dashboard',
    },
    tips: [
      'On your live invite, the “Your wedding? Edit details” link at the bottom also takes you to your dashboard.',
      'Tap Cancel to leave without a change.',
    ],
  },
  {
    id: 'guest-invites',
    eyebrow: 'Personal invites',
    title: 'Make and send a personal invite for each guest',
    intro:
      'Each guest gets their own link. It opens your invite with Shri Ganesh and “Hi” with their name, then your song, the date, the venue map and the RSVP.',
    steps: INVITE_STEPS,
    video: {
      src: '/help/send-guest-invite.mp4',
      poster: '/help/send-guest-invite.webp',
      label: 'Video: make a guest link and send it on WhatsApp',
    },
    tips: [
      'To send a link another way, tap “Copy link” and paste it in an SMS or an email.',
      'Made a link by mistake? Tap Delete next to it. If that guest opens the old link, they see your invite without their name. You cannot get a deleted link back.',
      'If the preview has no picture on WhatsApp, see the question about link previews below.',
    ],
  },
];

function HowToSection({ howTo }: { howTo: HowTo }) {
  const headingId = `${howTo.id}-heading`;
  return (
    <section
      id={howTo.id}
      aria-labelledby={headingId}
      className="grid scroll-mt-24 gap-8 lg:grid-cols-2 lg:items-start lg:gap-x-12"
    >
      <div className="flex flex-col gap-5">
        <div className="flex max-w-prose flex-col gap-3">
          <p className="bg-brand-soft rounded-pill text-small self-start px-4 py-1.5 font-semibold">
            {howTo.eyebrow}
          </p>
          <h2 id={headingId} className="text-title">
            {howTo.title}
          </h2>
          <p className="text-ink-soft">{howTo.intro}</p>
        </div>
        <ol className="flex max-w-prose flex-col gap-4">
          {howTo.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="bg-brand-soft rounded-pill font-weighted flex size-7 shrink-0 items-center justify-center"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <ul className="text-ink-soft flex max-w-prose list-disc flex-col gap-2 pl-6">
          {howTo.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
      {/* The steps above say what the video shows, so it needs no captions file. */}
      <video
        controls
        playsInline
        preload="none"
        poster={howTo.video.poster}
        width={720}
        height={1280}
        aria-label={howTo.video.label}
        className="bg-sunken rounded-card shadow-hard mx-auto aspect-9/16 w-full max-w-72 lg:sticky lg:top-24"
      >
        <source src={howTo.video.src} type="video/mp4" />
        <p>Your browser cannot play this video. The steps say the same.</p>
      </video>
    </section>
  );
}

export default function HelpPage() {
  const chatUrl = whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO);

  return (
    <PageShell>
      <JsonLd data={faqPageSchema(PRODUCT_FAQS)} />

      <header className="flex max-w-prose flex-col gap-5">
        <h1 className="text-hero">How can we help?</h1>
        <p className="text-ink-soft">
          Your dashboard is where you change your wedding details and make an invite for each guest.
          Sign in at vivah.online/dashboard with the phone number that your personal link came to.
          Each step below names the button you tap.
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
        <HowToSection key={howTo.id} howTo={howTo} />
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

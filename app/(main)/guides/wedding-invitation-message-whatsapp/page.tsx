import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqList } from '@/components/guides/FaqList';
import { GuideCta } from '@/components/guides/GuideCta';
import { LastUpdated } from '@/components/guides/LastUpdated';
import { MessageGroupSection } from '@/components/guides/MessageGroupSection';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { env } from '@/lib/env';
import { articleSchema, breadcrumbSchema, faqPageSchema, SHARE_IMAGE, siteOrigin } from '@/lib/seo';
import { INVITATION_MESSAGE_GROUPS, MESSAGE_GUIDE_FAQS } from '@/lib/whatsapp-guides';

/**
 * `GET /guides/wedding-invitation-message-whatsapp`.
 *
 * Answers "whatsapp wedding invitation message" and "wedding invitation
 * message" (PRD, SEO plan, WhatsApp keyword cluster): ready messages by
 * audience, in English and Hindi, each with a link that opens WhatsApp.
 */

const PATH = '/guides/wedding-invitation-message-whatsapp';
const TITLE = 'WhatsApp Wedding Invitation Message: Ready to Send';
const DESCRIPTION =
  'Wedding invitation messages for WhatsApp, for family, friends and colleagues, in English and Hindi. Tap one to send it on WhatsApp.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: 'article',
    images: [SHARE_IMAGE],
  },
};

const MESSAGE_COUNT = INVITATION_MESSAGE_GROUPS.reduce(
  (total, group) => total + group.messages.length,
  0,
);

export default function WeddingInvitationMessagePage() {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const headline = `WhatsApp wedding invitation messages: ${MESSAGE_COUNT} ready to send`;
  return (
    <PageShell>
      <JsonLd
        data={articleSchema({
          origin,
          path: PATH,
          headline,
          description: DESCRIPTION,
          brand: env.appName,
        })}
      />
      <JsonLd data={faqPageSchema(MESSAGE_GUIDE_FAQS)} />
      <JsonLd
        data={breadcrumbSchema(origin, [
          { name: 'Home', path: '/' },
          { name: 'WhatsApp wedding invitation messages', path: PATH },
        ])}
      />

      <header className="flex max-w-prose flex-col gap-5">
        <h1 className="text-hero">{headline}</h1>
        <p className="text-ink-soft">
          A good wedding invitation message on WhatsApp names the guest, the couple, the date and
          the city, and links to an invite with the full details and the map. Below are messages for
          family, friends and colleagues, in English and Hindi. Replace the words in square
          brackets, then tap &ldquo;Send on WhatsApp&rdquo;.
        </p>
        <LastUpdated />
      </header>

      <section className="flex max-w-prose flex-col gap-4">
        <h2 className="text-title">What to put in a wedding invitation message</h2>
        <ol className="text-ink-soft flex list-decimal flex-col gap-2 pl-6">
          <li>The guest’s name, with ji for elders.</li>
          <li>Who is getting married, and who is inviting.</li>
          <li>The date, and the city or venue.</li>
          <li>A link to the invite, with the map and every function.</li>
          <li>A line that asks them to reply, so you can plan seats and rooms.</li>
        </ol>
        <p className="text-ink-soft">
          Keep the message short. Elders read the details in the message; friends tap the link. A
          link that opens with the guest’s own name does the work a handwritten card used to do.
        </p>
      </section>

      {INVITATION_MESSAGE_GROUPS.map((group) => (
        <MessageGroupSection key={group.heading} group={group} />
      ))}

      <section className="flex max-w-prose flex-col gap-4">
        <h2 className="text-title">Send it with a link, not a photo of a card</h2>
        <p className="text-ink-soft">
          A card image gets lost in the chat and has no map. A{' '}
          <Link
            href="/whatsapp-wedding-invitation"
            className="text-ink decoration-brand underline decoration-2 underline-offset-4"
          >
            wedding invitation for WhatsApp
          </Link>{' '}
          is a link that opens with your guest’s name, the venue map, a countdown and a one-tap
          RSVP. When guests write back, point them to{' '}
          <Link
            href="/guides/reply-to-wedding-invitation-on-whatsapp"
            className="text-ink decoration-brand underline decoration-2 underline-offset-4"
          >
            replies to a wedding invitation
          </Link>
          .
        </p>
      </section>

      <FaqList faqs={MESSAGE_GUIDE_FAQS} />

      <GuideCta heading="Give every guest their own invite">
        Type both names and the date. Your preview comes to your WhatsApp, and you pay only if you
        like it.
      </GuideCta>
    </PageShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqList } from '@/components/guides/FaqList';
import { GuideCta } from '@/components/guides/GuideCta';
import { LastUpdated } from '@/components/guides/LastUpdated';
import { MessageGroupSection } from '@/components/guides/MessageGroupSection';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { env } from '@/lib/env';
import { articleSchema, breadcrumbSchema, faqPageSchema, siteOrigin } from '@/lib/seo';
import { REPLY_GUIDE_FAQS, REPLY_MESSAGE_GROUPS } from '@/lib/whatsapp-guides';

/**
 * `GET /guides/reply-to-wedding-invitation-on-whatsapp`.
 *
 * Answers "reply for wedding invitation on whatsapp" (PRD, SEO plan, WhatsApp
 * keyword cluster). The readers are guests, and every guest is a future
 * couple, so the page ends with the product's one action.
 */

const PATH = '/guides/reply-to-wedding-invitation-on-whatsapp';
const TITLE = 'How to Reply to a Wedding Invitation on WhatsApp';
const DESCRIPTION =
  'Replies to a wedding invitation on WhatsApp: accept, decline politely or send blessings, in English and Hindi. Tap one to send it.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'article' },
};

export default function ReplyToWeddingInvitationPage() {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const headline = 'How to reply to a wedding invitation on WhatsApp';
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
      <JsonLd data={faqPageSchema(REPLY_GUIDE_FAQS)} />
      <JsonLd
        data={breadcrumbSchema(origin, [
          { name: 'Home', path: '/' },
          { name: 'Reply to a wedding invitation on WhatsApp', path: PATH },
        ])}
      />

      <header className="flex max-w-prose flex-col gap-5">
        <h1 className="text-hero">{headline}</h1>
        <p className="text-ink-soft">
          Reply within a day or two. Thank the family, congratulate the couple, and say clearly
          whether you will come and how many of you. If you cannot come, say so politely and send
          your blessings. Ready replies in English and Hindi are below; tap one to send it on
          WhatsApp.
        </p>
        <LastUpdated />
      </header>

      {REPLY_MESSAGE_GROUPS.map((group) => (
        <MessageGroupSection key={group.heading} group={group} />
      ))}

      <section className="flex max-w-prose flex-col gap-4">
        <h2 className="text-title">If the invite has an RSVP button</h2>
        <p className="text-ink-soft">
          Many invites on WhatsApp are now a link to a web page. If yours has an RSVP button, tap
          it: it opens a WhatsApp chat with the family, with your reply already typed. Add a line of
          your own before you send it.
        </p>
      </section>

      <FaqList faqs={REPLY_GUIDE_FAQS} />

      <GuideCta heading="Getting married soon? Make yours">
        Send each guest an invite that opens with their name, the venue map and a one-tap RSVP. See
        it on your WhatsApp before you pay.
      </GuideCta>

      <p className="text-ink-soft max-w-prose">
        Sending invitations yourself? Read{' '}
        <Link
          href="/guides/wedding-invitation-message-whatsapp"
          className="text-ink decoration-brand underline decoration-2 underline-offset-4"
        >
          WhatsApp wedding invitation messages
        </Link>
        .
      </p>
    </PageShell>
  );
}

import { ContactLink } from '@/components/ui/ContactLink';
import { BUSINESS, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { displayPhone } from '@/lib/invite-contact';

/**
 * Who answers, then how to reach us: WhatsApp, phone and email, as links a phone can tap. Used
 * by the contact page and the end of each policy. A Server Component.
 */
export function SupportContacts(): React.JSX.Element {
  return (
    <>
      <p>{BUSINESS.promise}</p>
      <ul>
        <li>
          WhatsApp:{' '}
          <a
            href={whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink decoration-brand underline decoration-2 underline-offset-4"
          >
            chat with us
          </a>{' '}
          (fastest)
        </li>
        <li>
          Phone: <ContactLink kind="phone" value={displayPhone(BUSINESS.whatsAppE164)} />
        </li>
        <li>
          Help with your invite or a payment: <ContactLink kind="email" value={BUSINESS.email} />
        </li>
        <li>
          Anything else: <ContactLink kind="email" value={BUSINESS.helloEmail} />
        </li>
        <li>Hours: {BUSINESS.hours}</li>
      </ul>
    </>
  );
}

import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { whatsAppShareUrl } from '@/lib/seo';
import type { ReadyMessage } from '@/lib/whatsapp-guides';

export interface MessageCardProps {
  message: ReadyMessage;
}

/**
 * One ready-to-send message, with a link that opens WhatsApp with the text
 * already typed. A Server Component: `wa.me/?text=` needs no JavaScript, and
 * the text is in the HTML for search engines.
 */
export function MessageCard({ message }: MessageCardProps) {
  return (
    <Card as="li" className="flex min-w-0 flex-col gap-4">
      <h3 className="text-heading">{message.label}</h3>
      <p lang={message.lang} className="text-ink-soft break-words whitespace-pre-line">
        {message.text}
      </p>
      <div className="mt-auto">
        <a
          href={whatsAppShareUrl(message.text)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: 'secondary' })}
        >
          Send on WhatsApp
        </a>
      </div>
    </Card>
  );
}

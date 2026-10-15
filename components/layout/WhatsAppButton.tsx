import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { BUSINESS, WHATSAPP_HELLO, whatsAppChatUrl } from '@/lib/business';
import { cn } from '@/lib/utils';

export interface WhatsAppButtonProps {
  className?: string;
}

/**
 * The floating "chat with us" button, bottom right on every product page. It
 * opens WhatsApp with a first message typed in.
 *
 * It sits in the bottom-right corner, with safe-area padding on a phone.
 * A Server Component: it is a plain link.
 */
export function WhatsAppButton({ className }: WhatsAppButtonProps) {
  return (
    <a
      href={whatsAppChatUrl(BUSINESS.whatsAppE164, WHATSAPP_HELLO)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        'bg-whatsapp text-surface border-surface shadow-hard-lg fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full border-2 transition-transform hover:-translate-y-0.5 md:right-6 md:bottom-6',
        className,
      )}
    >
      <WhatsAppIcon className="size-8" />
    </a>
  );
}

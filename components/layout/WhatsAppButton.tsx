import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { cn } from '@/lib/utils';
import { WHATSAPP_CHAT_PATH } from '@/lib/whatsapp-hello';

export interface WhatsAppButtonProps {
  className?: string;
}

/**
 * The floating "chat with us" button, bottom right on every product page. It
 * opens WhatsApp, through `/api/whatsapp`, with the admin's first message
 * typed in.
 *
 * It sits in the bottom-right corner, with safe-area padding on a phone.
 * A Server Component: it is a plain link.
 */
export function WhatsAppButton({ className }: WhatsAppButtonProps) {
  return (
    <a
      href={WHATSAPP_CHAT_PATH}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      data-track-cta="whatsapp-float"
      className={cn(
        'bg-whatsapp text-surface border-surface shadow-hard-lg fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full border-2 transition-transform hover:-translate-y-0.5 md:right-6 md:bottom-6',
        className,
      )}
    >
      <WhatsAppIcon className="size-8" />
    </a>
  );
}

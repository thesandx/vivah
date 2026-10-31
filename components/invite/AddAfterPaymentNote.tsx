import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { cn } from '@/lib/utils';

/**
 * The note under an empty part of the unpaid preview (the venue, the
 * families, the functions). It tells the couple how they fill it in: the
 * dashboard link comes to their WhatsApp number right after they pay.
 *
 * The card takes its colours from the section's own colour (`className`
 * sets `color`), so one note suits the ivory and the dark sections. A
 * Server Component.
 */
export interface AddAfterPaymentNoteProps {
  /** What the couple adds, such as "the venue and the map". */
  what: string;
  /** Sets the text colour, and with it the border and the tint. */
  className?: string;
}

export function AddAfterPaymentNote({ what, className }: AddAfterPaymentNoteProps) {
  return (
    <aside aria-label="Add these after payment" className={cn('jewel-later-note', className)}>
      <span className="jewel-later-icon">
        <WhatsAppIcon className="size-5" />
      </span>
      <p className="jewel-later-title">You add {what} after payment</p>
      <p className="jewel-later-body">
        Right after you pay, your dashboard link comes to your WhatsApp number. Open it, add the
        details, and your guests see them at once.
      </p>
    </aside>
  );
}

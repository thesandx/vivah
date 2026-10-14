import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Sticker } from '@/components/ui/Sticker';
import { cn } from '@/lib/utils';
import { formatWeddingDate } from '@/lib/wedding-date';

export interface InviteCardProps {
  bride: string;
  groom: string;
  /** `YYYY-MM-DD`, or `null` when the couple has not added it yet. */
  weddingDate: string | null;
  /** Marks a private preview, before payment. */
  preview?: boolean;
  className?: string;
}

/**
 * The couple's invite: their names and their day. A Server Component.
 *
 * The same card renders the private preview and the live invite, so what a
 * couple approves before paying is what their guests see after. Events,
 * venue, map and photos come from the dashboard in a later step.
 */
export function InviteCard({
  bride,
  groom,
  weddingDate,
  preview = false,
  className,
}: InviteCardProps) {
  return (
    <Card tone="brand-soft" as="article" className={cn('flex flex-col gap-6', className)}>
      <Sticker kind="heart" size={28} className="absolute top-5 right-5" />
      {preview && (
        <div>
          <Badge tone="brand">Preview</Badge>
        </div>
      )}
      <p className="text-ink-soft">Together with their families</p>
      <h1 className="text-hero flex flex-col gap-2 break-words">
        <span>{bride}</span>
        <span className="text-title text-ink-soft">and</span>
        <span>{groom}</span>
      </h1>
      <p className="text-heading">
        {weddingDate === null ? 'The date will be shared soon.' : formatWeddingDate(weddingDate)}
      </p>
    </Card>
  );
}

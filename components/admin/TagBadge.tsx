import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { SHOWN_LEAD_TAG_LABELS, type ShownLeadTag } from '@/lib/lead-tags';

/** A preview's tag, in words. A Server Component. */

const TONES: Record<ShownLeadTag, BadgeTone> = {
  new: 'neutral',
  old: 'neutral',
  hot: 'danger',
  cold: 'brand',
  test: 'neutral',
};

export interface TagBadgeProps {
  tag: ShownLeadTag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return <Badge tone={TONES[tag]}>{SHOWN_LEAD_TAG_LABELS[tag]}</Badge>;
}

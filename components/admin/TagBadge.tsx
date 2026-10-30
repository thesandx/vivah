import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { LEAD_TAG_LABELS, type LeadTag } from '@/lib/lead-tags';

/** A preview's tag, in words. A Server Component. */

const TONES: Record<LeadTag, BadgeTone> = {
  new: 'neutral',
  hot: 'danger',
  cold: 'brand',
  test: 'neutral',
};

export interface TagBadgeProps {
  tag: LeadTag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return <Badge tone={TONES[tag]}>{LEAD_TAG_LABELS[tag]}</Badge>;
}

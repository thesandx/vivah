import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { LeadState, WeddingState } from '@/lib/admin-list';

/** A wedding's or a preview's state, in words. A Server Component. */

const LABELS: Record<WeddingState | LeadState, { label: string; tone: BadgeTone }> = {
  live: { label: 'Live', tone: 'success' },
  unavailable: { label: 'Unavailable', tone: 'brand' },
  deleted: { label: 'Deleted', tone: 'danger' },
  sent: { label: 'Not opened', tone: 'neutral' },
  opened: { label: 'Opened', tone: 'brand' },
  expired: { label: 'Expired', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'success' },
};

export interface StateBadgeProps {
  state: WeddingState | LeadState;
}

export function StateBadge({ state }: StateBadgeProps) {
  const { label, tone } = LABELS[state];
  return <Badge tone={tone}>{label}</Badge>;
}

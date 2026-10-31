import {
  PREVIEW_EVENTS,
  PREVIEW_SECTIONS,
  type PreviewEventId,
  type PreviewSectionId,
  type PreviewViewer,
} from '@/lib/preview-tracking';
import type { Device } from '@/lib/visit-tracking';

/**
 * Turns stored preview beacons into what `/admin` shows (ADR-0019): one
 * preview's activity, and the funnel over many previews. Pure, so it is
 * tested without a database.
 */

/** A section counts as seen after this long in the middle of the screen. */
export const PREVIEW_SEEN_MS = 1000;

export interface StoredPreviewBeacon {
  leadId: string;
  viewId: string;
  device: Device;
  viewer: PreviewViewer;
  sectionMs: Partial<Record<PreviewSectionId, number>>;
  events: readonly PreviewEventId[];
  createdAt: Date;
}

const EVENT_LABEL = new Map<PreviewEventId, string>(
  PREVIEW_EVENTS.map((event) => [event.id, event.label]),
);

export function previewEventLabel(id: PreviewEventId): string {
  return EVENT_LABEL.get(id) ?? id;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return Math.round(value);
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** Milliseconds per section, summed over the beacons. */
function sectionTotals(
  beacons: readonly StoredPreviewBeacon[],
): Partial<Record<PreviewSectionId, number>> {
  const totals: Partial<Record<PreviewSectionId, number>> = {};
  for (const beacon of beacons) {
    for (const [id, ms] of Object.entries(beacon.sectionMs) as [PreviewSectionId, number][]) {
      totals[id] = (totals[id] ?? 0) + ms;
    }
  }
  return totals;
}

/** The lowest section seen for a second or more, or `null`. */
function furthestSection(totals: Partial<Record<PreviewSectionId, number>>): string | null {
  let furthest: string | null = null;
  for (const section of PREVIEW_SECTIONS) {
    if ((totals[section.id] ?? 0) >= PREVIEW_SEEN_MS) furthest = section.label;
  }
  return furthest;
}

// --- One preview ----------------------------------------------------------

export interface ActivityEvent {
  id: PreviewEventId;
  label: string;
  count: number;
  /** When the first beacon that carried it arrived. */
  firstAt: Date;
}

export interface ActivityLine {
  at: Date;
  viewer: PreviewViewer;
  device: Device;
  labels: string[];
}

export interface PreviewActivity {
  /** Browser tabs that opened the preview. A reload is a new one. */
  views: number;
  coupleViews: number;
  otherViews: number;
  firstAt: Date | null;
  lastAt: Date | null;
  totalSeconds: number;
  sections: { id: PreviewSectionId; label: string; seconds: number }[];
  /** The lowest section seen, or `null`. */
  furthest: string | null;
  /** Each event that happened, in the funnel's order. */
  events: ActivityEvent[];
  /** Beacons that carried an event, newest first. */
  timeline: ActivityLine[];
}

/** One preview's activity from its beacons, in any order. */
export function buildPreviewActivity(beacons: readonly StoredPreviewBeacon[]): PreviewActivity {
  const oldestFirst = [...beacons].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const views = new Map<string, PreviewViewer>();
  const events = new Map<PreviewEventId, { count: number; firstAt: Date }>();
  for (const beacon of oldestFirst) {
    // A view is the couple's if any of its beacons says so.
    if (views.get(beacon.viewId) !== 'couple') views.set(beacon.viewId, beacon.viewer);
    for (const id of beacon.events) {
      const seen = events.get(id);
      if (seen === undefined) events.set(id, { count: 1, firstAt: beacon.createdAt });
      else seen.count += 1;
    }
  }
  const totals = sectionTotals(oldestFirst);
  const coupleViews = [...views.values()].filter((viewer) => viewer === 'couple').length;

  return {
    views: views.size,
    coupleViews,
    otherViews: views.size - coupleViews,
    firstAt: oldestFirst[0]?.createdAt ?? null,
    lastAt: oldestFirst.at(-1)?.createdAt ?? null,
    totalSeconds: Math.round(Object.values(totals).reduce((sum, ms) => sum + ms, 0) / 1000),
    sections: PREVIEW_SECTIONS.map((section) => ({
      id: section.id,
      label: section.label,
      seconds: Math.round((totals[section.id] ?? 0) / 1000),
    })),
    furthest: furthestSection(totals),
    events: PREVIEW_EVENTS.flatMap((event) => {
      const seen = events.get(event.id);
      return seen === undefined ? [] : [{ id: event.id, label: event.label, ...seen }];
    }),
    timeline: oldestFirst
      .filter((beacon) => beacon.events.length > 0)
      .reverse()
      .map((beacon) => ({
        at: beacon.createdAt,
        viewer: beacon.viewer,
        device: beacon.device,
        labels: beacon.events.map(previewEventLabel),
      })),
  };
}

/**
 * The one line for the Previews list: how far the couple got, e.g.
 * "Closed the payment window". `null` when nothing was measured.
 */
export function furthestStep(activity: Pick<PreviewActivity, 'events'>): string | null {
  return activity.events.at(-1)?.label ?? null;
}

// --- Many previews --------------------------------------------------------

/** The funnel's steps: events, plus reaching the foot of the invite. */
export const FUNNEL_STEPS = [
  { id: 'opened', label: 'Opened the preview' },
  { id: 'gate-opened', label: 'Tapped open the invite' },
  { id: 'scratched', label: 'Scratched the date' },
  { id: 'reached-foot', label: 'Scrolled to the end' },
  { id: 'sheet-opened', label: 'Opened the pay sheet' },
  { id: 'coupon-applied', label: 'Applied a coupon' },
  { id: 'pay-tapped', label: 'Tapped pay' },
  { id: 'checkout-opened', label: 'Payment window opened' },
  { id: 'checkout-closed', label: 'Closed the payment window' },
  { id: 'payment-failed', label: 'Payment failed' },
  { id: 'paid', label: 'Paid' },
] as const;

export type FunnelStepId = (typeof FUNNEL_STEPS)[number]['id'];

export interface FunnelRow {
  id: FunnelStepId;
  label: string;
  previews: number;
  percent: number;
}

export interface PreviewFunnel {
  /** Previews with at least one beacon in the range. */
  previews: number;
  steps: FunnelRow[];
  /** Previews somebody other than the couple opened: shared with family. */
  shared: number;
  /** Previews that saw "this preview has closed", and those that then tapped WhatsApp. */
  closedSeen: number;
  closedWhatsApp: number;
  /** The median time a preview was looked at, over all its views. */
  medianSeconds: number;
  sections: { label: string; seenPercent: number; medianSeconds: number }[];
}

/**
 * The funnel over the previews in `beacons`. `include` keeps only real
 * previews (it drops made-up ids and test previews). `paid` counts a preview
 * paid in a browser the page could not measure.
 */
export function buildPreviewFunnel(
  beacons: readonly StoredPreviewBeacon[],
  include: (leadId: string) => boolean,
  paid: (leadId: string) => boolean,
): PreviewFunnel {
  const byLead = new Map<string, StoredPreviewBeacon[]>();
  for (const beacon of beacons) {
    if (!include(beacon.leadId)) continue;
    const list = byLead.get(beacon.leadId);
    if (list === undefined) byLead.set(beacon.leadId, [beacon]);
    else list.push(beacon);
  }

  const counts = new Map<FunnelStepId, number>();
  const sectionMs = new Map<PreviewSectionId, number[]>();
  const totals: number[] = [];
  let shared = 0;
  let closedSeen = 0;
  let closedWhatsApp = 0;
  for (const [leadId, list] of byLead) {
    const events = new Set(list.flatMap((beacon) => beacon.events));
    const section = sectionTotals(list);
    const reached = new Set<FunnelStepId>();
    for (const step of FUNNEL_STEPS) {
      if (step.id === 'reached-foot') {
        if ((section.closing ?? 0) >= PREVIEW_SEEN_MS) reached.add(step.id);
      } else if (step.id === 'paid') {
        if (events.has('paid') || paid(leadId)) reached.add(step.id);
      } else if (events.has(step.id)) {
        reached.add(step.id);
      }
    }
    for (const id of reached) counts.set(id, (counts.get(id) ?? 0) + 1);
    if (list.some((beacon) => beacon.viewer === 'other')) shared += 1;
    if (events.has('closed-seen')) closedSeen += 1;
    if (events.has('closed-whatsapp')) closedWhatsApp += 1;
    for (const item of PREVIEW_SECTIONS) {
      const ms = section[item.id] ?? 0;
      if (ms >= PREVIEW_SEEN_MS) sectionMs.set(item.id, [...(sectionMs.get(item.id) ?? []), ms]);
    }
    totals.push(Object.values(section).reduce((sum, ms) => sum + ms, 0));
  }

  const previews = byLead.size;
  return {
    previews,
    steps: FUNNEL_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      previews: counts.get(step.id) ?? 0,
      percent: percent(counts.get(step.id) ?? 0, previews),
    })),
    shared,
    closedSeen,
    closedWhatsApp,
    medianSeconds: Math.round(median(totals) / 1000),
    sections: PREVIEW_SECTIONS.map((section) => {
      const seen = sectionMs.get(section.id) ?? [];
      return {
        label: section.label,
        seenPercent: percent(seen.length, previews),
        medianSeconds: Math.round(median(seen) / 1000),
      };
    }),
  };
}

import {
  type CtaId,
  type Device,
  DEVICES,
  HOME_CTAS,
  HOME_SECTIONS,
  type SectionId,
  SIGNUP_STEPS,
  type SignupStepId,
  VISIT_SOURCES,
  type VisitSource,
} from '@/lib/visit-tracking';

/**
 * The `/admin` Visitors report, from the stored beacons. Pure, so a test needs
 * no database: the page loads the beacons and the leads' states and passes
 * them in. ADR-0014.
 *
 * A visit is one browser tab on the home page. Its beacons are merged first,
 * then counted.
 */

/** A section counts as seen after this long in the middle of the screen. A fast scroll past does not. */
export const SEEN_MS = 1000;

/** The report's time ranges, in days. */
export const VISIT_RANGES = [
  { value: '1', label: 'Today and yesterday', days: 2 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
] as const;

export type VisitRange = (typeof VISIT_RANGES)[number];

/** The range named by `?days=`, else the last 7 days. */
export function visitRangeFrom(raw: string | string[] | undefined): VisitRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return VISIT_RANGES.find((range) => range.value === value) ?? VISIT_RANGES[1];
}

/** A stored beacon, as the report reads it. Firestore keeps an absent field as `null`. */
export interface StoredBeacon {
  visitId: string;
  device: Device;
  source?: VisitSource | null | undefined;
  campaign?: string | null | undefined;
  sectionMs: Partial<Record<SectionId, number>>;
  clicks: readonly CtaId[];
  steps: readonly SignupStepId[];
  lead?: { id: string; cta: CtaId } | null | undefined;
}

interface Visit {
  device: Device;
  source: VisitSource;
  campaign: string | undefined;
  sectionMs: Partial<Record<SectionId, number>>;
  clicks: CtaId[];
  steps: Set<SignupStepId>;
  leads: { id: string; cta: CtaId }[];
}

export interface SectionRow {
  id: SectionId;
  label: string;
  /** Visits that saw this section. */
  seen: number;
  /** Of all visits, as a whole percentage. */
  seenPercent: number;
  /** The median seconds among the visits that saw it. */
  medianSeconds: number;
  /** This section's share of all time on the page, as a whole percentage. */
  timeShare: number;
  /** Visits with no preview whose furthest section was this one. */
  leftHere: number;
}

export interface StepRow {
  id: SignupStepId;
  label: string;
  visits: number;
  percent: number;
}

export interface CtaRow {
  id: CtaId;
  label: string;
  signup: boolean;
  /** Visits that tapped it at least once. */
  visits: number;
  /** Every tap. */
  taps: number;
  /** Previews credited to it: it was the last sign-up CTA tapped before the preview. */
  previews: number;
  /** Of those previews, the ones paid for. */
  paid: number;
}

export interface GroupRow {
  key: string;
  visits: number;
  previews: number;
  paid: number;
}

export interface VisitReport {
  visits: number;
  /** Visits that made at least one preview. */
  convertedVisits: number;
  previews: number;
  paid: number;
  sections: SectionRow[];
  steps: StepRow[];
  ctas: CtaRow[];
  sources: GroupRow[];
  devices: GroupRow[];
  /** Ad campaigns from `utm_campaign` or `utm_content`. */
  campaigns: GroupRow[];
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return Math.round(value / 1000);
}

/** Merges each visit's beacons. The beacons may come in any order. */
function mergeVisits(beacons: readonly StoredBeacon[]): Visit[] {
  const visits = new Map<string, Visit>();
  for (const beacon of beacons) {
    let visit = visits.get(beacon.visitId);
    if (visit === undefined) {
      visit = {
        device: beacon.device,
        source: 'direct',
        campaign: undefined,
        sectionMs: {},
        clicks: [],
        steps: new Set(),
        leads: [],
      };
      visits.set(beacon.visitId, visit);
    }
    if (beacon.source != null) visit.source = beacon.source;
    if (beacon.campaign != null) visit.campaign = beacon.campaign;
    for (const [id, ms] of Object.entries(beacon.sectionMs) as [SectionId, number][]) {
      visit.sectionMs[id] = (visit.sectionMs[id] ?? 0) + ms;
    }
    visit.clicks.push(...beacon.clicks);
    for (const step of beacon.steps) visit.steps.add(step);
    const lead = beacon.lead;
    if (lead != null && !visit.leads.some((known) => known.id === lead.id)) {
      visit.leads.push(lead);
      visit.steps.add('made');
    }
  }
  return [...visits.values()];
}

function group(
  visits: readonly Visit[],
  keys: readonly string[],
  keyOf: (visit: Visit) => string,
  isPaid: (leadId: string) => boolean,
): GroupRow[] {
  return keys
    .map((key) => {
      const members = visits.filter((visit) => keyOf(visit) === key);
      return {
        key,
        visits: members.length,
        previews: members.reduce((sum, visit) => sum + visit.leads.length, 0),
        paid: members.reduce(
          (sum, visit) => sum + visit.leads.filter((lead) => isPaid(lead.id)).length,
          0,
        ),
      };
    })
    .filter((row) => row.visits > 0)
    .sort((a, b) => b.visits - a.visits);
}

/**
 * Builds the report. `isPaid` says whether a lead was paid for, from the
 * `leads` collection, so a payment in another browser still counts.
 */
export function buildVisitReport(
  beacons: readonly StoredBeacon[],
  isPaid: (leadId: string) => boolean,
): VisitReport {
  const visits = mergeVisits(beacons);
  const total = visits.length;
  const allLeads = visits.flatMap((visit) => visit.leads);

  const totalMs = visits.reduce(
    (sum, visit) => sum + Object.values(visit.sectionMs).reduce((a, b) => a + b, 0),
    0,
  );

  const furthest = (visit: Visit): number => {
    let index = -1;
    HOME_SECTIONS.forEach((section, at) => {
      if ((visit.sectionMs[section.id] ?? 0) >= SEEN_MS) index = at;
    });
    return index;
  };

  const sections = HOME_SECTIONS.map((section, index): SectionRow => {
    const times = visits
      .map((visit) => visit.sectionMs[section.id] ?? 0)
      .filter((ms) => ms >= SEEN_MS);
    const sectionMs = visits.reduce((sum, visit) => sum + (visit.sectionMs[section.id] ?? 0), 0);
    return {
      id: section.id,
      label: section.label,
      seen: times.length,
      seenPercent: percent(times.length, total),
      medianSeconds: median(times),
      timeShare: percent(sectionMs, totalMs),
      leftHere: visits.filter((visit) => visit.leads.length === 0 && furthest(visit) === index)
        .length,
    };
  });

  const steps = SIGNUP_STEPS.map((step): StepRow => {
    const count = visits.filter((visit) => visit.steps.has(step.id)).length;
    return { id: step.id, label: step.label, visits: count, percent: percent(count, total) };
  });

  const ctas = HOME_CTAS.map((cta): CtaRow => {
    const credited = allLeads.filter((lead) => lead.cta === cta.id);
    return {
      id: cta.id,
      label: cta.label,
      signup: cta.signup,
      visits: visits.filter((visit) => visit.clicks.includes(cta.id)).length,
      taps: visits.reduce(
        (sum, visit) => sum + visit.clicks.filter((click) => click === cta.id).length,
        0,
      ),
      previews: credited.length,
      paid: credited.filter((lead) => isPaid(lead.id)).length,
    };
  }).sort((a, b) => b.previews - a.previews || b.paid - a.paid || b.visits - a.visits);

  return {
    visits: total,
    convertedVisits: visits.filter((visit) => visit.leads.length > 0).length,
    previews: allLeads.length,
    paid: allLeads.filter((lead) => isPaid(lead.id)).length,
    sections,
    steps,
    ctas,
    sources: group(visits, VISIT_SOURCES, (visit) => visit.source, isPaid),
    devices: group(visits, DEVICES, (visit) => visit.device, isPaid),
    campaigns: group(
      visits,
      [
        ...new Set(
          visits.flatMap((visit) => (visit.campaign === undefined ? [] : [visit.campaign])),
        ),
      ],
      (visit) => visit.campaign ?? '',
      isPaid,
    ),
  };
}

/** A source's name for a person. */
export const SOURCE_LABELS: Record<VisitSource, string> = {
  'google-ads': 'Google Ads',
  google: 'Google search',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  'other-site': 'Another website',
  direct: 'Direct or unknown',
};

/**
 * The visit counts for one live invite, from its beacons (ADR-0020). Pure, so
 * a test needs no database. `/admin/invites/<id>` shows the result.
 */

import type { InviteEventId, InviteViewer } from '@/lib/invite-tracking';
import type { Device } from '@/lib/visit-tracking';

/** What the report reads from one stored beacon. */
export interface InviteBeaconRow {
  event: InviteEventId;
  viewer: InviteViewer;
  firstVisit: boolean;
  device: Device;
  guestLinkId?: string | undefined;
  createdAt: Date;
}

/** A guest link, as the admin card lists it. */
export interface GuestLinkRow {
  id: string;
  name: string;
}

export interface LinkVisits {
  /** `null` for the plain link with no guest name, or a named link no longer in the list. */
  id: string | null;
  label: string;
  opens: number;
  visitors: number;
  rsvpTaps: number;
  lastAt: Date;
}

export interface DayVisits {
  /** `YYYY-MM-DD`, India time. */
  day: string;
  opens: number;
  visitors: number;
}

export interface InviteVisitReport {
  /** Every time a guest's browser loaded the invite. */
  opens: number;
  /** Browsers that loaded it for the first time: about one per guest device. */
  visitors: number;
  /** Taps on the cover that open the invite. */
  envelopeOpens: number;
  rsvpTaps: number;
  /** Loads by the couple's own browser, kept apart from the guests'. */
  coupleOpens: number;
  firstAt: Date | null;
  lastAt: Date | null;
  devices: Record<Device, number>;
  /** Most opened first. */
  links: LinkVisits[];
  /** The guest links nobody has opened yet, in the couple's order. */
  unopenedLinks: string[];
  /** The last 14 days, newest first, days with no visit included. */
  days: DayVisits[];
}

const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The India-time day of a moment: `2026-11-10`. */
export function indiaDay(at: Date): string {
  return DAY.format(at);
}

export const REPORT_DAYS = 14;

export function buildInviteVisitReport(
  beacons: readonly InviteBeaconRow[],
  guestLinks: readonly GuestLinkRow[],
  now: Date = new Date(),
): InviteVisitReport {
  const names = new Map(guestLinks.map((link) => [link.id, link.name]));
  const report: InviteVisitReport = {
    opens: 0,
    visitors: 0,
    envelopeOpens: 0,
    rsvpTaps: 0,
    coupleOpens: 0,
    firstAt: null,
    lastAt: null,
    devices: { phone: 0, tablet: 0, desktop: 0 },
    links: [],
    unopenedLinks: [],
    days: [],
  };
  const links = new Map<string, LinkVisits>();
  const days = new Map<string, DayVisits>();

  for (const beacon of beacons) {
    if (beacon.viewer === 'couple') {
      if (beacon.event === 'opened') report.coupleOpens += 1;
      continue;
    }
    const known = beacon.guestLinkId !== undefined && names.has(beacon.guestLinkId);
    const key = beacon.guestLinkId === undefined ? 'plain' : known ? beacon.guestLinkId : 'other';
    let link = links.get(key);
    if (link === undefined) {
      link = {
        id: known ? (beacon.guestLinkId ?? null) : null,
        label:
          key === 'plain'
            ? 'Plain link (no guest name)'
            : known
              ? (names.get(key) ?? key)
              : 'A deleted or hand-typed guest link',
        opens: 0,
        visitors: 0,
        rsvpTaps: 0,
        lastAt: beacon.createdAt,
      };
      links.set(key, link);
    }
    if (beacon.createdAt > link.lastAt) link.lastAt = beacon.createdAt;

    if (beacon.event === 'envelope-opened') report.envelopeOpens += 1;
    if (beacon.event === 'rsvp-tapped') {
      report.rsvpTaps += 1;
      link.rsvpTaps += 1;
    }
    if (beacon.event !== 'opened') continue;

    report.opens += 1;
    link.opens += 1;
    report.devices[beacon.device] += 1;
    if (beacon.firstVisit) {
      report.visitors += 1;
      link.visitors += 1;
    }
    if (report.firstAt === null || beacon.createdAt < report.firstAt) {
      report.firstAt = beacon.createdAt;
    }
    if (report.lastAt === null || beacon.createdAt > report.lastAt) {
      report.lastAt = beacon.createdAt;
    }
    const day = indiaDay(beacon.createdAt);
    const entry = days.get(day) ?? { day, opens: 0, visitors: 0 };
    entry.opens += 1;
    if (beacon.firstVisit) entry.visitors += 1;
    days.set(day, entry);
  }

  report.links = [...links.values()]
    .filter((link) => link.opens > 0 || link.rsvpTaps > 0)
    .sort((a, b) => b.opens - a.opens || b.lastAt.getTime() - a.lastAt.getTime());
  report.unopenedLinks = guestLinks
    .filter((link) => (links.get(link.id)?.opens ?? 0) === 0)
    .map((link) => link.name);
  for (let back = 0; back < REPORT_DAYS; back += 1) {
    const day = indiaDay(new Date(now.getTime() - back * 24 * 60 * 60_000));
    report.days.push(days.get(day) ?? { day, opens: 0, visitors: 0 });
  }
  return report;
}

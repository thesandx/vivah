import { describe, expect, it } from 'vitest';

import {
  buildPreviewActivity,
  buildPreviewFunnel,
  furthestStep,
  type StoredPreviewBeacon,
} from '@/lib/preview-report';

const T0 = new Date('2026-10-30T10:00:00Z');

function at(minutes: number): Date {
  return new Date(T0.getTime() + minutes * 60_000);
}

function beacon(overrides: Partial<StoredPreviewBeacon>): StoredPreviewBeacon {
  return {
    leadId: 'lead-a',
    viewId: 'view-1',
    device: 'phone',
    viewer: 'couple',
    sectionMs: {},
    events: [],
    createdAt: T0,
    ...overrides,
  };
}

describe('buildPreviewActivity', () => {
  const beacons = [
    beacon({
      viewId: 'view-1',
      sectionMs: { names: 5000, 'save-date': 3000 },
      events: ['opened', 'gate-opened', 'scratched'],
      createdAt: at(0),
    }),
    beacon({
      viewId: 'view-1',
      sectionMs: { closing: 2500 },
      events: ['sheet-opened', 'pay-tapped', 'checkout-opened'],
      createdAt: at(2),
    }),
    beacon({ viewId: 'view-1', events: ['checkout-closed'], createdAt: at(3) }),
    beacon({
      viewId: 'view-2',
      viewer: 'other',
      device: 'desktop',
      sectionMs: { names: 900 },
      events: ['opened'],
      createdAt: at(30),
    }),
  ];
  const activity = buildPreviewActivity([...beacons].reverse());

  it('counts views by who looked', () => {
    expect(activity.views).toBe(2);
    expect(activity.coupleViews).toBe(1);
    expect(activity.otherViews).toBe(1);
    expect(activity.firstAt).toEqual(at(0));
    expect(activity.lastAt).toEqual(at(30));
  });

  it('adds up time per section and finds the lowest one seen', () => {
    expect(activity.totalSeconds).toBe(11);
    expect(activity.sections.find((row) => row.id === 'names')?.seconds).toBe(6);
    expect(activity.furthest).toBe('Closing and pay sheet');
  });

  it('lists each event once, in funnel order, with a count', () => {
    expect(activity.events.map((event) => event.id)).toEqual([
      'opened',
      'gate-opened',
      'scratched',
      'sheet-opened',
      'pay-tapped',
      'checkout-opened',
      'checkout-closed',
    ]);
    expect(activity.events[0]).toMatchObject({ count: 2, firstAt: at(0) });
    expect(furthestStep(activity)).toBe('Closed the payment window');
  });

  it('shows the timeline newest first', () => {
    expect(activity.timeline[0]).toMatchObject({
      at: at(30),
      viewer: 'other',
      labels: ['Opened the preview'],
    });
    expect(activity.timeline).toHaveLength(4);
  });

  it('is empty with no beacons', () => {
    const empty = buildPreviewActivity([]);
    expect(empty.views).toBe(0);
    expect(empty.furthest).toBeNull();
    expect(furthestStep(empty)).toBeNull();
  });
});

describe('buildPreviewFunnel', () => {
  const beacons = [
    beacon({
      leadId: 'a',
      sectionMs: { names: 4000, closing: 2000 },
      events: ['opened', 'gate-opened', 'sheet-opened', 'pay-tapped'],
    }),
    beacon({ leadId: 'a', viewId: 'v2', viewer: 'other', events: ['opened'] }),
    beacon({ leadId: 'b', sectionMs: { names: 8000 }, events: ['opened', 'gate-opened'] }),
    beacon({ leadId: 'c', events: ['closed-seen', 'closed-whatsapp'] }),
    beacon({ leadId: 'test', events: ['opened', 'pay-tapped'] }),
  ];
  const funnel = buildPreviewFunnel(
    beacons,
    (id) => id !== 'test',
    (id) => id === 'b',
  );
  const step = (id: string) => funnel.steps.find((row) => row.id === id);

  it('counts previews, not views, and leaves out what include refuses', () => {
    expect(funnel.previews).toBe(3);
    expect(step('opened')).toMatchObject({ previews: 2, percent: 67 });
    expect(step('pay-tapped')).toMatchObject({ previews: 1, percent: 33 });
    expect(step('reached-foot')?.previews).toBe(1);
  });

  it('counts a payment the lead records even with no paid event', () => {
    expect(step('paid')?.previews).toBe(1);
  });

  it('counts shared and closed previews', () => {
    expect(funnel.shared).toBe(1);
    expect(funnel.closedSeen).toBe(1);
    expect(funnel.closedWhatsApp).toBe(1);
  });

  it('gives section reach and the median time', () => {
    expect(funnel.sections[0]).toEqual({
      label: 'Ganesh ji and names',
      seenPercent: 67,
      medianSeconds: 6,
    });
    expect(funnel.medianSeconds).toBe(6);
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteVisitTracker } from '@/components/analytics/InviteVisitTracker';
import { usePreviewTracking } from '@/hooks/usePreviewTracking';
import { INVITE_BEACON_PATH } from '@/lib/invite-tracking';

const WEDDING = 'AbCdEfGhIjKlMnOpQrSt';
const LINK = 'a'.repeat(64);
const sendBeacon = vi.fn<(url: string, body: string) => boolean>(() => true);

function sent(): Record<string, unknown>[] {
  return sendBeacon.mock.calls.map(([url, body]) => {
    expect(url).toBe(INVITE_BEACON_PATH);
    return JSON.parse(body) as Record<string, unknown>;
  });
}

function Gate() {
  const { track } = usePreviewTracking();
  return (
    <button type="button" onClick={() => track('gate-opened')}>
      Open
    </button>
  );
}

function Page({ guestLinkId = null }: { guestLinkId?: string | null }) {
  return (
    <InviteVisitTracker weddingId={WEDDING} guestLinkId={guestLinkId}>
      <Gate />
      <a href="#rsvp" data-invite-event="rsvp-tapped">
        RSVP <span>now</span>
      </a>
    </InviteVisitTracker>
  );
}

describe('InviteVisitTracker', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
    sendBeacon.mockClear();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('counts a first visit, the envelope once, and each RSVP tap', () => {
    render(<Page guestLinkId={LINK} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByText('now'));
    const beacons = sent();
    expect(beacons.map((beacon) => beacon.event)).toEqual([
      'opened',
      'envelope-opened',
      'rsvp-tapped',
    ]);
    expect(beacons[0]).toMatchObject({
      weddingId: WEDDING,
      viewer: 'guest',
      firstVisit: true,
      guestLinkId: LINK,
    });
    expect(new Set(beacons.map((beacon) => beacon.viewId)).size).toBe(1);
  });

  it('counts a second visit from the same browser as not new', () => {
    render(<Page />).unmount();
    sendBeacon.mockClear();
    render(<Page />);
    expect(sent()[0]).toMatchObject({ firstVisit: false, viewer: 'guest' });
    expect(sent()[0]).not.toHaveProperty('guestLinkId');
  });

  it('sends nothing in the admin browser, and removes the mark', () => {
    window.history.replaceState(null, '', '/#from-admin');
    render(<Page />);
    fireEvent.click(screen.getByText('now'));
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
    render(<Page />);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('marks the couple from their dashboard link', () => {
    window.history.replaceState(null, '', '/#from-dashboard');
    render(<Page />);
    expect(sent()[0]).toMatchObject({ viewer: 'couple', firstVisit: true });
    expect(window.location.hash).toBe('');
  });

  it('still counts when storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Page />);
    expect(sent()[0]).toMatchObject({ firstVisit: true });
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('falls back to fetch when sendBeacon refuses', () => {
    sendBeacon.mockReturnValueOnce(false);
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<Page />);
    expect(fetchMock).toHaveBeenCalledWith(
      INVITE_BEACON_PATH,
      expect.objectContaining({ method: 'POST', keepalive: true }),
    );
    vi.unstubAllGlobals();
  });
});

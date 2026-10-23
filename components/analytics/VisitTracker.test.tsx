import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VisitTracker } from '@/components/analytics/VisitTracker';
import { useVisitTracking } from '@/hooks/useVisitTracking';
import { VISIT_BEACON_PATH, VISIT_ID_STORAGE_KEY } from '@/lib/visit-tracking';

/** A stand-in observer: the test says which section is in the middle of the screen. */
let middle: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;

class FakeIntersectionObserver {
  constructor(callback: typeof middle) {
    middle = callback;
  }
  observe(): void {}
  disconnect(): void {}
}

const sendBeacon = vi.fn<(url: string, body: string) => boolean>(() => true);

function sent(): Record<string, unknown>[] {
  return sendBeacon.mock.calls.map(([, body]) => JSON.parse(body) as Record<string, unknown>);
}

function hide(): void {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
}

function Card() {
  const tracking = useVisitTracking();
  return (
    <>
      <button type="button" onClick={() => tracking.trackStep('started', 'dialog')}>
        Start
      </button>
      <button type="button" onClick={() => tracking.trackLead('AbCdEfGhIjKlMnOpQrSt', 'dialog')}>
        Make
      </button>
    </>
  );
}

function Page() {
  return (
    <VisitTracker>
      <section data-track-section="hero">Hero</section>
      <section data-track-section="try">
        <button type="button" data-track-cta="try-cta">
          Make one for us <span>inner</span>
        </button>
        <button type="button" data-track-cta="not-a-real-id">
          Other
        </button>
      </section>
      <Card />
    </VisitTracker>
  );
}

describe('VisitTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
    sendBeacon.mockClear();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/?utm_source=ig&utm_campaign=reel-01');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends taps, section time and where the visit came from when the tab hides', () => {
    render(<Page />);
    const [hero, try_] = document.querySelectorAll('section');
    act(() => middle?.([{ target: hero as Element, isIntersecting: true }]));
    vi.advanceTimersByTime(3000);
    act(() => middle?.([{ target: try_ as Element, isIntersecting: true }]));
    vi.advanceTimersByTime(2000);
    fireEvent.click(screen.getByText('inner'));
    fireEvent.click(screen.getByText('Other'));
    hide();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0]?.[0]).toBe(VISIT_BEACON_PATH);
    expect(sent()[0]).toMatchObject({
      seq: 0,
      source: 'instagram',
      campaign: 'reel-01',
      sectionMs: { hero: 3000, try: 2000 },
      clicks: ['try-cta'],
      steps: [],
    });
  });

  it('sends nothing when nothing happened, and numbers the next beacon', () => {
    render(<Page />);
    hide();
    expect(sendBeacon).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Start'));
    hide();
    expect(sent()[0]).toMatchObject({ seq: 0, steps: ['started'] });
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByText('inner'));
    hide();
    // A repeated step is not sent again, and later beacons carry no source.
    expect(sent()[1]).toMatchObject({ seq: 1, steps: [], clicks: ['try-cta'] });
    expect(sent()[1]).not.toHaveProperty('source');
    expect(JSON.parse(window.sessionStorage.getItem(VISIT_ID_STORAGE_KEY) ?? '{}')).toMatchObject({
      seq: 2,
    });
  });

  it('credits a preview to the last sign-up button tapped, and sends it at once', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('inner'));
    fireEvent.click(screen.getByText('Make'));
    expect(sent()[0]).toMatchObject({
      lead: { id: 'AbCdEfGhIjKlMnOpQrSt', cta: 'try-cta' },
      steps: ['made'],
    });
  });

  it('does nothing in a browser without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Page />);
    fireEvent.click(screen.getByText('inner'));
    hide();
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});

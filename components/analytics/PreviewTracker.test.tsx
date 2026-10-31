import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewTracker } from '@/components/analytics/PreviewTracker';
import { usePreviewTracking } from '@/hooks/usePreviewTracking';
import { PREVIEW_BEACON_PATH } from '@/lib/preview-tracking';

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

function PayButton() {
  const { track } = usePreviewTracking();
  return (
    <button type="button" onClick={() => track('pay-tapped')}>
      Pay
    </button>
  );
}

function Page() {
  return (
    <PreviewTracker leadId="AbCdEfGhIjKlMnOpQrSt" viewer="couple" firstEvent="opened">
      <header data-preview-section="names">Names</header>
      <footer data-preview-section="closing">
        <a href="#x" data-preview-event="closed-whatsapp">
          WhatsApp <span>inner</span>
        </a>
        <PayButton />
      </footer>
    </PreviewTracker>
  );
}

describe('PreviewTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance'] });
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
    sendBeacon.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the first event and section time when the tab hides', () => {
    render(<Page />);
    const [names] = document.querySelectorAll('header');
    act(() => middle?.([{ target: names as Element, isIntersecting: true }]));
    vi.advanceTimersByTime(4000);
    hide();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0]?.[0]).toBe(PREVIEW_BEACON_PATH);
    expect(sent()[0]).toMatchObject({
      leadId: 'AbCdEfGhIjKlMnOpQrSt',
      seq: 0,
      viewer: 'couple',
      sectionMs: { names: 4000 },
      events: ['opened'],
    });
  });

  it('sends a payment step at once, and numbers the next beacon', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Pay'));
    expect(sent()[0]).toMatchObject({ seq: 0, events: ['opened', 'pay-tapped'] });
    fireEvent.click(screen.getByText('inner'));
    expect(sent()[1]).toMatchObject({ seq: 1, events: ['closed-whatsapp'] });
  });

  it('does nothing in a browser without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Page />);
    fireEvent.click(screen.getByText('Pay'));
    hide();
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});

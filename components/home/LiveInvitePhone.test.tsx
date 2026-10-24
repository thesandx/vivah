import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveInvitePhone } from './LiveInvitePhone';

/** A stand-in IntersectionObserver whose callback the test fires by hand. */
let intersect: (() => void) | null = null;
class FakeIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    intersect = () =>
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  disconnect() {}
}

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

const SRC = 'https://priya-rahul.vivah.online/Neha';

beforeEach(() => {
  intersect = null;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  // jsdom lays nothing out, so give the screen a phone-frame width.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(288);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPhone() {
  return render(<LiveInvitePhone src={SRC} bride="Priya" groom="Rahul" />);
}

const frame = (container: HTMLElement) => container.querySelector('iframe');

describe('LiveInvitePhone', () => {
  it('loads no invite on a page load, even with the phone on screen', () => {
    const { container } = renderPhone();
    act(() => intersect?.());
    expect(frame(container)).toBeNull();
    expect(screen.getByRole('button', { name: /tap to open/i })).toBeInTheDocument();
  });

  it('loads the invite once the visitor scrolls and the phone is near', () => {
    const { container } = renderPhone();
    act(() => intersect?.());
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    const iframe = frame(container);
    expect(iframe?.getAttribute('src')).toBe(SRC);
    expect(iframe?.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('loads the invite when the visitor taps the cover', () => {
    const { container } = renderPhone();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    expect(frame(container)).not.toBeNull();
  });

  it('lays the invite out at a phone width and scales it to the frame', () => {
    const { container } = renderPhone();
    fireEvent.click(screen.getByRole('button', { name: /tap to open/i }));
    const style = frame(container)?.style;
    expect(style?.width).toBe('390px');
    expect(style?.transform).toBe(`scale(${288 / 390})`);
  });
});

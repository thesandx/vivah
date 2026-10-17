import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoScroller } from '@/components/ui/AutoScroller';

const ITEMS = [
  { key: 'a', node: <p>First card</p> },
  { key: 'b', node: <p>Second card</p> },
];

describe('AutoScroller', () => {
  it('is a labelled region a keyboard can reach and scroll', () => {
    render(<AutoScroller items={ITEMS} label="Reviews from couples" />);
    const region = screen.getByRole('region', { name: 'Reviews from couples' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toContain('scrollbar-none');
  });

  it('shows each card once while the cards fit, with no copy and no arrows', () => {
    render(<AutoScroller items={ITEMS} label="Chats" />);
    expect(screen.getAllByText('First card')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  describe('the images in the row', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /* eslint-disable @next/next/no-img-element -- a plain <img> is what the cards in the row render */
    const PHOTOS = [
      { key: 'a', node: <img src="/a.webp" alt="First couple" loading="lazy" /> },
      { key: 'b', node: <img src="/b.webp" alt="Second couple" loading="lazy" /> },
    ];
    /* eslint-enable @next/next/no-img-element */

    it('load all at once when the row comes near the screen, so no card arrives blank', () => {
      let report: IntersectionObserverCallback = () => undefined;
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: IntersectionObserverCallback) {
            report = callback;
          }
          observe() {}
          disconnect() {}
        },
      );

      render(<AutoScroller items={PHOTOS} label="Reviews" />);
      const photos = screen.getAllByRole('img') as HTMLImageElement[];
      expect(photos.map((photo) => photo.getAttribute('loading'))).toEqual(['lazy', 'lazy']);

      act(() => {
        report([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      });
      expect(photos.map((photo) => photo.getAttribute('loading'))).toEqual(['eager', 'eager']);
    });

    it('load at once where the browser cannot watch the row', () => {
      vi.stubGlobal('IntersectionObserver', undefined);
      render(<AutoScroller items={PHOTOS} label="Reviews" />);
      const photos = screen.getAllByRole('img') as HTMLImageElement[];
      expect(photos.map((photo) => photo.getAttribute('loading'))).toEqual(['eager', 'eager']);
    });
  });

  describe('when the cards are wider than the row', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('drifts to the end, turns round, and steps with the arrows', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 900,
      } as DOMRect);
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(410);
      const frames: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;

      render(<AutoScroller items={ITEMS} label="Chats" speed={100} />);
      const region = screen.getByRole('region', { name: 'Chats' });

      // Each card shows once: there is no copy and no loop.
      expect(screen.getAllByText('First card')).toHaveLength(1);

      // Two frames 40 ms apart move the row 4 px at 100 px a second.
      act(() => {
        frames.shift()?.(1000);
        frames.shift()?.(1040);
      });
      expect(region.scrollLeft).toBe(4);

      // It stops at the end, 10 px along, rests there, then drifts back.
      act(() => {
        frames.shift()?.(1080);
        frames.shift()?.(1120);
      });
      expect(region.scrollLeft).toBe(10);
      act(() => frames.shift()?.(1160));
      expect(region.scrollLeft).toBe(10);
      act(() => {
        frames.shift()?.(2700);
        frames.shift()?.(2740);
      });
      expect(region.scrollLeft).toBeLessThan(10);

      // A finger holds it still.
      fireEvent.touchStart(region);
      const held = region.scrollLeft;
      act(() => frames.shift()?.(1080));
      expect(region.scrollLeft).toBe(held);
      fireEvent.touchEnd(region);

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(scrollBy).toHaveBeenCalledWith({ left: 900, behavior: 'smooth' });
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(scrollBy).toHaveBeenCalledWith({ left: -900, behavior: 'smooth' });
    });
  });
});

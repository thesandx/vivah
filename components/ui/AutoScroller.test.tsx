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

  describe('when the cards are wider than the row', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('loops with a hidden copy, drifts, and steps with the arrows', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 900,
      } as DOMRect);
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
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

      // The copy is there for the loop, and hidden from screen readers.
      expect(screen.getAllByText('First card')).toHaveLength(2);
      expect(screen.getAllByRole('listitem')).toHaveLength(2);

      // Two frames 40 ms apart move the row 4 px at 100 px a second.
      act(() => {
        frames.shift()?.(1000);
        frames.shift()?.(1040);
      });
      expect(region.scrollLeft).toBeGreaterThan(0);

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

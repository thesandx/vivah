import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveTheDateCards } from '@/components/invite/SaveTheDateCards';

/** jsdom has no canvas, so the foil and the confetti draw on a context that does nothing. */
function fakeContext(): CanvasRenderingContext2D {
  const nothing = () => {};
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) => {
      if (key === 'createLinearGradient') return () => ({ addColorStop: nothing });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return nothing;
    },
    set: () => true,
  });
}

function mockMotion(reduce: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

describe('SaveTheDateCards', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => fakeContext() as never,
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function reveal(label: string): void {
    fireEvent.click(screen.getByRole('button', { name: `Reveal the ${label}` }));
  }

  it('has the whole date in the page before any scratch', () => {
    mockMotion(false);
    render(<SaveTheDateCards day="07" month="12" year="26" />);
    expect(screen.getByText('07')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('26')).toBeInTheDocument();
  });

  it('bursts confetti only once all three cards are revealed', () => {
    mockMotion(false);
    const { container } = render(<SaveTheDateCards day="07" month="12" year="26" />);
    reveal('day');
    reveal('month');
    expect(container.querySelector('.jewel-confetti')).toBeNull();
    reveal('year');
    expect(container.querySelector('.jewel-confetti')).toHaveAttribute('aria-hidden', 'true');
  });

  it('plays no confetti for a guest who asks for reduced motion', () => {
    mockMotion(true);
    const { container } = render(<SaveTheDateCards day="07" month="12" year="26" />);
    reveal('day');
    reveal('month');
    reveal('year');
    expect(container.querySelector('.jewel-confetti')).toBeNull();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});

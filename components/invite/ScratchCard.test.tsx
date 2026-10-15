import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScratchCard } from '@/components/invite/ScratchCard';

/** jsdom has no canvas, so the foil draws on a context that does nothing. */
function fakeContext(): CanvasRenderingContext2D {
  const nothing = () => {};
  return {
    scale: nothing,
    createLinearGradient: () => ({ addColorStop: nothing }),
    fillRect: nothing,
    beginPath: nothing,
    arc: nothing,
    fill: nothing,
    fillText: nothing,
    moveTo: nothing,
    lineTo: nothing,
    stroke: nothing,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  } as unknown as CanvasRenderingContext2D;
}

describe('ScratchCard', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => fakeContext() as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has the value in the page under a foil that screen readers skip', () => {
    const { container } = render(<ScratchCard value="12" label="Day" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('canvas')).not.toHaveClass('opacity-0');
  });

  it('gives a keyboard user a way to reveal it', () => {
    const { container } = render(<ScratchCard value="Dec" label="Month" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal the month' }));
    expect(container.querySelector('canvas')).toHaveClass('opacity-0');
    expect(screen.queryByRole('button', { name: 'Reveal the month' })).not.toBeInTheDocument();
  });

  it('shows the value at once where the browser cannot draw the foil', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => null);
    const { container } = render(<ScratchCard value="2026" label="Year" />);
    expect(container.querySelector('canvas')).toHaveClass('opacity-0');
  });
});

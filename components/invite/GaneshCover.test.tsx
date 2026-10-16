import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GaneshCover } from '@/components/invite/GaneshCover';

describe('GaneshCover', () => {
  it('sets the shloka as live text, not as a picture of words', () => {
    render(<GaneshCover />);
    expect(screen.getByText('श्री गणेशाय नमः').tagName.toLowerCase()).toBe('text');
  });

  it('is drawn in the page, with no image to download, and hidden from screen readers', () => {
    const { container } = render(<GaneshCover />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
    expect(container.querySelector('img, image')).toBeNull();
  });
});

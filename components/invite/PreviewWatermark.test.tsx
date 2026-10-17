import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PreviewWatermark } from './PreviewWatermark';

describe('PreviewWatermark', () => {
  it('tiles the label over the screen without taking a tap', () => {
    const { container } = render(<PreviewWatermark label="vivah.online · preview" />);
    const watermark = screen.getByTestId('preview-watermark');
    expect(watermark).toHaveAttribute('aria-hidden', 'true');
    expect(watermark).toHaveClass('pointer-events-none', 'fixed', 'inset-0');
    expect(container.querySelectorAll('text')).toHaveLength(3);
    expect(container.textContent).toContain('vivah.online · preview');
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PetalShower } from '@/components/invite/PetalShower';

describe('PetalShower', () => {
  it('is decoration that screen readers skip and taps pass through', () => {
    const { container } = render(<PetalShower />);
    const layer = container.firstElementChild;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toHaveClass('jewel-petals');
  });

  it('starts with petals mid-fall, so the shower is never empty', () => {
    const { container } = render(<PetalShower />);
    const petals = [...container.querySelectorAll<HTMLElement>('.jewel-petal')];
    expect(petals.length).toBeGreaterThan(6);
    for (const petal of petals) {
      expect(petal.style.animationDelay).toMatch(/^-\d/);
    }
  });

  it('colours every petal from a jewel token, never a raw colour', () => {
    const { container } = render(<PetalShower />);
    const fills = [...container.querySelectorAll('.jewel-petal path:first-child')].map(
      (path) => path.getAttribute('class') ?? '',
    );
    expect(fills.every((fill) => fill.startsWith('fill-jewel-'))).toBe(true);
  });
});

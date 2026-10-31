import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PreviewNotch } from '@/components/invite/PreviewNotch';

function notch(): HTMLElement {
  return screen.getByText('Preview').closest('div') as HTMLElement;
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('PreviewNotch', () => {
  it('shows the full notch at the top, and shrinks once the page scrolls', () => {
    render(
      <PreviewNotch>
        <span>29:41</span>
      </PreviewNotch>,
    );
    expect(screen.getByText('only you can see this')).toBeInTheDocument();
    expect(notch()).not.toHaveAttribute('data-compact');

    scrollTo(400);
    expect(notch()).toHaveAttribute('data-compact');
    expect(screen.getByText('only you can see this')).toHaveClass('group-data-compact:hidden');
    expect(screen.getByText('29:41')).toBeInTheDocument();

    scrollTo(0);
    expect(notch()).not.toHaveAttribute('data-compact');
  });
});

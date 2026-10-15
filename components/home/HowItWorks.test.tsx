import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HowItWorks } from '@/components/home/HowItWorks';

function pressed(): string[] {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent ?? '');
}

/** The filling bar under the lit step. */
function bar(): Element | null {
  return document.querySelector('.animate-step-progress');
}

describe('HowItWorks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows three steps, with the first one lit', () => {
    render(<HowItWorks />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(pressed()).toEqual([expect.stringContaining('Type your names')]);
    expect(screen.getByText('Step 1 of 3 · Type your names')).toBeInTheDocument();
  });

  it('lights the next step when the bar is full, and loops back to the first', () => {
    render(<HowItWorks />);
    for (const title of ['See your website', 'Send it to everyone', 'Type your names']) {
      const current = bar();
      expect(current).not.toBeNull();
      // jsdom has no AnimationEvent, so React listens for the WebKit name.
      if (current !== null) fireEvent(current, new Event('webkitAnimationEnd', { bubbles: true }));
      expect(pressed()).toEqual([expect.stringContaining(title)]);
    }
  });

  it('shows the step a visitor taps, with its screen, and stops the loop', () => {
    render(<HowItWorks />);
    fireEvent.click(screen.getByRole('button', { name: /Send it to everyone/ }));
    expect(pressed()).toEqual([expect.stringContaining('Send it to everyone')]);
    expect(screen.getByText('Step 3 of 3 · Send it to everyone')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/how-it-works/3');
    expect(bar()).toBeNull();
  });

  it('moves nothing by itself with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    render(<HowItWorks />);
    expect(bar()).toBeNull();
  });
});

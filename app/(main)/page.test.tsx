import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/(main)/page';

/**
 * Smoke test for the home page. `HomePage` is a synchronous Server Component,
 * so React Testing Library renders it directly. See docs/testing.md.
 */
describe('HomePage', () => {
  it('renders the heading', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Create your personal wedding website in 5 minutes',
      }),
    ).toBeInTheDocument();
  });

  it('shows both carousels, with open slots that claim no review', () => {
    render(<HomePage />);
    expect(screen.getByRole('region', { name: 'Reviews from couples' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Messages couples received' })).toBeInTheDocument();
    expect(screen.queryByText(/out of 5 stars/)).not.toBeInTheDocument();
  });

  it('offers a WhatsApp chat with a first message', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'Ask us on WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/919546342507?text=Hi',
    );
  });

  it('starts the funnel with the two names', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { name: 'The two of you' });
    expect(heading).toHaveAttribute('id', 'start');
    const card = within(heading.closest('form') as HTMLElement);
    expect(card.getByLabelText("Bride's name")).toBeInTheDocument();
    expect(card.getByLabelText("Groom's name")).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Begin our story' })).toBeDisabled();
  });

  it('ends each section with its own call to action, each opening the sign-up dialog', () => {
    render(<HomePage />);
    const labels = [
      'Write our love story',
      'Begin our forever',
      'Give our wedding a home',
      'Make our invite timeless',
      'Write ours next',
      'Make the family go aww',
      'Show us our wedding website',
    ];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-haspopup',
        'dialog',
      );
    }
  });
});

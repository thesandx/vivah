import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/(main)/page';

// The testimonials are an async Server Component with its own test.
vi.mock('@/app/(main)/home-testimonials', () => ({ HomeTestimonials: () => null }));

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

  it('offers a WhatsApp chat with a first message', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'Ask us on WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/919546342507?text=Hi',
    );
  });

  it('starts the funnel with the two names', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'The two of you' })).toHaveAttribute('id', 'start');
    expect(screen.getByLabelText("Bride's name")).toBeInTheDocument();
    expect(screen.getByLabelText("Groom's name")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Begin our story' })).toBeDisabled();
  });
});

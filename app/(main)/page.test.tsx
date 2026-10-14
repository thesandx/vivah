import { render, screen } from '@testing-library/react';
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
      screen.getByRole('heading', { level: 1, name: 'Your wedding invite, on its own link' }),
    ).toBeInTheDocument();
  });

  it('starts the funnel with the lead form', () => {
    render(<HomePage />);
    expect(screen.getByLabelText("Bride's name")).toBeInTheDocument();
    expect(screen.getByLabelText("Groom's name")).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See my invite' })).toBeInTheDocument();
  });
});

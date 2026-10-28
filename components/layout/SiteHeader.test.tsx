import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SiteHeader } from './SiteHeader';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('SiteHeader', () => {
  it('lists the top-level destinations, with the logo linked home', () => {
    pathname = '/';
    render(<SiteHeader appName="Playroom" />);
    expect(screen.getByRole('link', { name: 'Playroom' })).toHaveAttribute('href', '/');
    for (const label of ['Home', 'Pricing', 'My site', 'Help']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the destination of a page below it as current', () => {
    pathname = '/dashboard/edit/raadha-shyam';
    render(<SiteHeader appName="Playroom" />);
    expect(screen.getByRole('link', { name: 'My site' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('has a hamburger menu for a phone', () => {
    render(<SiteHeader appName="Playroom" />);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });
});

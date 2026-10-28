import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PricingPage from '@/app/(main)/pricing/page';

/**
 * Smoke test for `/pricing`. `PricingPage` is a synchronous Server Component,
 * so React Testing Library renders it directly. See docs/testing.md.
 */
describe('PricingPage', () => {
  it('shows both plans with their prices', () => {
    render(<PricingPage />);
    const basic = screen.getByRole('region', { name: 'Basic' });
    const premium = screen.getByRole('region', { name: 'Premium' });
    expect(basic).toHaveTextContent('₹799');
    expect(premium).toHaveTextContent('₹1,299');
  });

  it('keeps the credit on Basic and removes it on Premium', () => {
    render(<PricingPage />);
    expect(screen.getByRole('region', { name: 'Basic' })).toHaveTextContent(
      'Small “Made with ♥ by vivah.online” line at the end',
    );
    expect(screen.getByRole('region', { name: 'Premium' })).toHaveTextContent(
      'No “Made with ♥ by vivah.online” line on your invite',
    );
  });

  it('starts Basic on the home form and asks for Premium on WhatsApp', () => {
    render(<PricingPage />);
    expect(screen.getByRole('link', { name: 'Start your invite' })).toHaveAttribute(
      'href',
      '/#start',
    );
    expect(screen.getByRole('link', { name: /Get Premium on WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/919546342507\?text=.*Premium/),
    );
  });
});

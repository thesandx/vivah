import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HelpPage from '@/app/(main)/help/page';
import { PRODUCT_FAQS } from '@/lib/seo';

/**
 * Smoke test for `/help`. `HelpPage` is a synchronous Server Component, so
 * React Testing Library renders it directly. See docs/testing.md.
 */
describe('HelpPage', () => {
  it('shows both how-tos, each with its video', () => {
    const { container } = render(<HelpPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Change the time, venue or map' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Make and send a personal invite for each guest',
      }),
    ).toBeInTheDocument();
    const sources = [...container.querySelectorAll('video source')].map((source) =>
      source.getAttribute('src'),
    );
    expect(sources).toEqual(['/help/edit-your-details.mp4', '/help/send-guest-invite.mp4']);
    for (const video of container.querySelectorAll('video')) {
      expect(video).toHaveAttribute('preload', 'none');
    }
  });

  it('names the dashboard buttons in its steps', () => {
    render(<HelpPage />);
    expect(screen.getByText('Find “Your details” and tap “Edit details”.')).toBeInTheDocument();
    expect(screen.getAllByText(/tap “Send OTP”/)).toHaveLength(2);
    expect(screen.getByText(/Tap “Make link”/)).toBeInTheDocument();
    expect(screen.getByText(/Tap “Send on WhatsApp”/)).toBeInTheDocument();
  });

  it('holds the questions couples ask', () => {
    render(<HelpPage />);
    for (const faq of PRODUCT_FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
  });

  it('links to the contact page', () => {
    render(<HelpPage />);
    expect(screen.getByRole('link', { name: 'All the ways to contact us' })).toHaveAttribute(
      'href',
      '/contact',
    );
  });
});

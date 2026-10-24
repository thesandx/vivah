import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/(main)/page';
import { HOME_CTAS, HOME_SECTIONS } from '@/lib/visit-tracking';

// The testimonials are an async Server Component with its own test.
vi.mock('@/app/(main)/home-testimonials', () => ({ HomeTestimonials: () => null }));
// So is the coupon ribbon; `OfferRibbon` has its own test.
vi.mock('@/app/(main)/home-ribbon', () => ({ HomeRibbon: () => null }));

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

  it('names the price under the headline', () => {
    render(<HomePage />);
    expect(screen.getByText('just ₹799')).toBeInTheDocument();
  });

  it('offers a WhatsApp chat with a first message', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'Ask us on WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/919546342507?text=Hi',
    );
  });

  it('links the sample invite from the closing call to action, before WhatsApp', () => {
    render(<HomePage />);
    const cta = screen.getByRole('heading', { name: 'Your love story deserves its own website' })
      .parentElement as HTMLElement;
    const links = within(cta).getAllByRole('link');
    const sample = within(cta).getByRole('link', { name: 'See a real invite' });
    expect(sample).toHaveAttribute('target', '_blank');
    expect(links.indexOf(sample)).toBe(
      links.indexOf(within(cta).getByRole('link', { name: /Ask us on WhatsApp/ })) - 1,
    );
    const hero = screen.getByRole('heading', { level: 1 }).closest('section') as HTMLElement;
    expect(within(hero).queryByRole('link', { name: 'See a real invite' })).toBeNull();
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
      'Show us our wedding website',
    ];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-haspopup',
        'dialog',
      );
    }
  });

  it('marks every section and call to action for the visit report, with known ids', () => {
    const { container } = render(<HomePage />);
    const sections = [...container.querySelectorAll('[data-track-section]')].map((element) =>
      element.getAttribute('data-track-section'),
    );
    // The reviews and the chats stream in from Firestore; their own test covers them.
    expect(sections).toEqual(
      HOME_SECTIONS.map((section) => section.id).filter((id) => id !== 'reviews' && id !== 'chats'),
    );
    const known = new Set<string>(HOME_CTAS.map((cta) => cta.id));
    const ctas = [...container.querySelectorAll('[data-track-cta]')].map(
      (element) => element.getAttribute('data-track-cta') ?? '',
    );
    expect(ctas.filter((id) => !known.has(id))).toEqual([]);
    for (const id of ['try-cta', 'guests-cta', 'how-cta', 'features-cta', 'compare-cta']) {
      expect(ctas).toContain(id);
    }
    expect(ctas).toContain('final-cta');
    expect(ctas).toContain('sticky-bar');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FaqList } from '@/components/guides/FaqList';

const FAQS = [
  { question: 'Is it free?', answer: 'No.' },
  { question: 'Hindi?', answer: 'Yes.' },
];

describe('FaqList', () => {
  it('shows every question, and keeps each answer in the page', () => {
    render(<FaqList faqs={FAQS} />);
    expect(screen.getByRole('heading', { name: 'Questions people ask' })).toBeInTheDocument();
    expect(screen.getByText('Is it free?')).toBeInTheDocument();
    // In the HTML while closed, so the FAQPage schema matches the page.
    expect(screen.getByText('Yes.')).toBeInTheDocument();
  });

  it('starts closed, opens on a tap and closes on the next', () => {
    render(<FaqList faqs={FAQS} />);
    const details = screen.getByText('Is it free?').closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');

    fireEvent.click(screen.getByText('Is it free?'));
    expect(details).toHaveAttribute('open');

    fireEvent.click(screen.getByText('Is it free?'));
    expect(details).not.toHaveAttribute('open');
  });

  it('shows a help link under an answer that has one, opening in a new tab', () => {
    render(
      <FaqList
        faqs={[
          {
            question: 'No picture?',
            answer: 'Turn previews on.',
            link: { href: 'https://faq.whatsapp.com/445453537819972/', label: 'WhatsApp Help' },
          },
        ]}
      />,
    );
    const link = screen.getByRole('link', { name: 'WhatsApp Help' });
    expect(link).toHaveAttribute('href', 'https://faq.whatsapp.com/445453537819972/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('opens the question a link points at, such as /help#link-preview', () => {
    window.location.hash = '#link-preview';
    render(
      <FaqList faqs={[...FAQS, { id: 'link-preview', question: 'No picture?', answer: 'On.' }]} />,
    );
    expect(screen.getByText('No picture?').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Is it free?').closest('details')).not.toHaveAttribute('open');
    window.location.hash = '';
  });
});

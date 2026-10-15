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
});

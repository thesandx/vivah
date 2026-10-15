import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FaqList } from '@/components/guides/FaqList';

describe('FaqList', () => {
  it('shows every question with its answer', () => {
    render(
      <FaqList
        faqs={[
          { question: 'Is it free?', answer: 'No.' },
          { question: 'Hindi?', answer: 'Yes.' },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Questions people ask' })).toBeInTheDocument();
    expect(screen.getByText('Is it free?')).toBeInTheDocument();
    expect(screen.getByText('Yes.')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageCard } from '@/components/guides/MessageCard';

describe('MessageCard', () => {
  it('shows the message and opens WhatsApp with it typed', () => {
    render(
      <MessageCard
        message={{ label: 'Casual', lang: 'en-IN', text: 'See you there & bring cake' }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Casual' })).toBeInTheDocument();
    expect(screen.getByText('See you there & bring cake')).toHaveAttribute('lang', 'en-IN');
    expect(screen.getByRole('link', { name: 'Send on WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/?text=See%20you%20there%20%26%20bring%20cake',
    );
  });
});

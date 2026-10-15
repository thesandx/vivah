import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WhatsAppButton } from '@/components/layout/WhatsAppButton';

describe('WhatsAppButton', () => {
  it('opens a WhatsApp chat with the support number and a first message', () => {
    render(<WhatsAppButton />);
    const link = screen.getByRole('link', { name: 'Chat with us on WhatsApp' });
    expect(link).toHaveAttribute('href', 'https://wa.me/919546342507?text=Hi');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

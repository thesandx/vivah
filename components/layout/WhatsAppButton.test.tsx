import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WhatsAppButton } from '@/components/layout/WhatsAppButton';

describe('WhatsAppButton', () => {
  it('links to the chat route, which types the admin first message', () => {
    render(<WhatsAppButton />);
    const link = screen.getByRole('link', { name: 'Chat with us on WhatsApp' });
    expect(link).toHaveAttribute('href', '/api/whatsapp');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

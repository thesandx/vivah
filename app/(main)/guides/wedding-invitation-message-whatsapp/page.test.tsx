import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WeddingInvitationMessagePage from '@/app/(main)/guides/wedding-invitation-message-whatsapp/page';

describe('WeddingInvitationMessagePage', () => {
  it('lists ready messages, each with a WhatsApp link', () => {
    render(<WeddingInvitationMessagePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /WhatsApp wedding invitation messages: \d+ ready to send/,
    );
    expect(
      screen.getByRole('heading', { name: 'Wedding invitation messages in Hindi' }),
    ).toBeInTheDocument();
    const sends = screen.getAllByRole('link', { name: 'Send on WhatsApp' });
    expect(sends.length).toBeGreaterThanOrEqual(10);
    expect(sends[0]?.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ReplyToWeddingInvitationPage from '@/app/(main)/guides/reply-to-wedding-invitation-on-whatsapp/page';

describe('ReplyToWeddingInvitationPage', () => {
  it('answers the question and offers replies to send', () => {
    render(<ReplyToWeddingInvitationPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How to reply to a wedding invitation on WhatsApp',
    );
    expect(
      screen.getByRole('heading', { name: 'Replies to decline a wedding invitation politely' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Send on WhatsApp' }).length).toBeGreaterThan(5);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WhatsAppWeddingInvitationPage from '@/app/(main)/whatsapp-wedding-invitation/page';

describe('WhatsAppWeddingInvitationPage', () => {
  it('names the search in the heading and starts the funnel', () => {
    const { container } = render(<WhatsAppWeddingInvitationPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Wedding invitation for WhatsApp',
    );
    expect(
      screen.getByRole('heading', { name: 'Paper card vs digital wedding invitation' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'See my invite' })[0]).toHaveAttribute('href', '/');
    const types = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => (JSON.parse(script.textContent ?? '{}') as { '@type'?: string })['@type'],
    );
    expect(types).toEqual(['FAQPage', 'BreadcrumbList']);
  });
});

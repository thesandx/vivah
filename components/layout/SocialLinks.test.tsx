import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SocialLinks } from './SocialLinks';

describe('SocialLinks', () => {
  it('names each icon link and opens profiles in a new tab', () => {
    render(
      <SocialLinks
        instagram="https://www.instagram.com/vivah.online/"
        facebook="https://www.facebook.com/profile.php?id=1"
        whatsApp="https://wa.me/919546342507?text=Hi"
        email="support@vivah.online"
      />,
    );
    const instagram = screen.getByRole('link', { name: 'vivah.online on Instagram' });
    expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/vivah.online/');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'vivah.online on Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/profile.php?id=1',
    );
    expect(screen.getByRole('link', { name: 'Chat with us on WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/919546342507?text=Hi',
    );
    const email = screen.getByRole('link', { name: 'Email us at support@vivah.online' });
    expect(email).toHaveAttribute('href', 'mailto:support@vivah.online');
    expect(email).not.toHaveAttribute('target');
  });

  it('renders only the links it is given, and nothing for none', () => {
    const { container, rerender } = render(<SocialLinks instagram="https://instagram.com/x" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    rerender(<SocialLinks />);
    expect(container).toBeEmptyDOMElement();
  });
});

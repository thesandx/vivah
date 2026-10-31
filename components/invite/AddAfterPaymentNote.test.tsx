import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddAfterPaymentNote } from '@/components/invite/AddAfterPaymentNote';

describe('AddAfterPaymentNote', () => {
  it('says what to add, where to add it, and that the link comes on WhatsApp too', () => {
    render(<AddAfterPaymentNote what="the venue and the map" className="text-jewel-emerald" />);
    const note = screen.getByRole('complementary', { name: 'Add these after payment' });
    expect(note).toHaveClass('text-jewel-emerald');
    expect(note).toHaveTextContent('Add the venue and the map after payment');
    expect(note).toHaveTextContent('Sign in at vivah.online/dashboard');
    expect(note).toHaveTextContent('We also send the link on WhatsApp.');
  });
});

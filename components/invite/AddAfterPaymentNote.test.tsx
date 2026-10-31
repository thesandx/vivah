import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddAfterPaymentNote } from '@/components/invite/AddAfterPaymentNote';

describe('AddAfterPaymentNote', () => {
  it('says what to add, and that the dashboard link comes on WhatsApp after payment', () => {
    render(<AddAfterPaymentNote what="the venue and the map" className="text-jewel-emerald" />);
    const note = screen.getByRole('complementary', { name: 'Add these after payment' });
    expect(note).toHaveClass('text-jewel-emerald');
    expect(note).toHaveTextContent('You add the venue and the map after payment');
    expect(note).toHaveTextContent('your dashboard link comes to your WhatsApp number');
  });
});

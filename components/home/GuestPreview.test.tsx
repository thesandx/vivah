import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GuestPreview } from './GuestPreview';

describe('GuestPreview', () => {
  it('shows eight features, each with a title', () => {
    render(<GuestPreview />);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('heading', { name: 'RSVP on WhatsApp' })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InviteCard } from '@/components/invite/InviteCard';

describe('InviteCard', () => {
  it('shows both names and the day', () => {
    render(<InviteCard bride="Raadha" groom="Shyam" weddingDate="2026-03-09" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('RaadhaandShyam');
    expect(screen.getByText('Monday, 9 March 2026')).toBeInTheDocument();
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('marks a preview, and says when the date is not set', () => {
    render(<InviteCard bride="Sita" groom="Ram" weddingDate={null} preview />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('The date will be shared soon.')).toBeInTheDocument();
  });
});

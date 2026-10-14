import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShubhVivahInvite } from '@/components/invite/ShubhVivahInvite';

describe('ShubhVivahInvite', () => {
  it('shows the names, the day and the guest', () => {
    render(
      <ShubhVivahInvite bride="Sara" groom="Kabir" weddingDate="2026-03-09" guestName="Kartheek" />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SaraandKabir');
    expect(screen.getByText('Dear Kartheek,')).toBeInTheDocument();
    expect(screen.getByText('Monday, 9 March 2026')).toBeInTheDocument();
  });

  it('leaves out the greeting, and says when the date is not set', () => {
    render(<ShubhVivahInvite bride="Sara" groom="Kabir" weddingDate={null} guestName={null} />);
    expect(screen.queryByText(/^Dear/)).not.toBeInTheDocument();
    expect(screen.getByText('The date will be shared soon')).toBeInTheDocument();
  });
});

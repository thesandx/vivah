import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublishBanner } from '@/components/invite/PublishBanner';

function renderBanner() {
  const publish = vi.fn(() => Promise.resolve({ ok: false as const, message: 'No' }));
  render(
    <PublishBanner
      bride="Riya"
      groom="Arjun"
      leadId="lead-1"
      chosen="riya-arjun"
      suggestions={[]}
      domainLabel="vivah.online"
      priceRupees={499}
      checkSlug={() => Promise.resolve({ available: true })}
      publish={publish}
    />,
  );
  return { publish };
}

describe('PublishBanner', () => {
  it('speaks to the couple first, with no price on the closed banner', () => {
    renderBanner();
    expect(screen.getByText("Riya & Arjun, it's almost yours")).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });

  it('opens to show the address, the price once, and the publish button', () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Make it ours' }));
    expect(screen.getByText('riya-arjun.vivah.online')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Publish our invite · ₹499' });
    fireEvent.click(button);
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun');
  });

  it('closes again', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Make it ours' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Make it ours' })).toBeInTheDocument();
  });
});

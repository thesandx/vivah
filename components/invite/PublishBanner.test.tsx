import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublishBanner } from '@/components/invite/PublishBanner';

function renderBanner() {
  const publish = vi.fn(() => new Promise<{ ok: false; message: string }>(() => undefined));
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
  it('opens on the price once, against what paper cards cost', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: 'Your invite is ready' })).toBeInTheDocument();
    expect(screen.getByText('₹499')).toBeInTheDocument();
    expect(screen.getByText('₹5,000 to ₹50,000+')).toBeInTheDocument();
  });

  it('makes no claim it cannot back', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    expect(screen.queryByText(/couples/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/money-back/i)).not.toBeInTheDocument();
  });

  it('opens to the summary and the publish button, and says the test payment charges nothing', () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to publish' }));
    expect(screen.getByText('riya-arjun.vivah.online')).toBeInTheDocument();
    expect(screen.getByText('Total, paid once')).toBeInTheDocument();
    expect(screen.getByText(/nothing is charged/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Refund policy' })).toHaveAttribute(
      'href',
      '/refund-policy',
    );
    const button = screen.getByRole('button', { name: 'Publish our invite' });
    fireEvent.click(button);
    expect(publish).toHaveBeenCalledWith('lead-1', 'riya-arjun');
  });

  it('shows the button working, and refuses a second tap', async () => {
    const { publish } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'See everything you get' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish our invite' }));
    const working = await screen.findByRole('button', { name: 'Publishing your invite' });
    expect(working).toBeDisabled();
    expect(working).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(working);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('closes again, with the button or Escape', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to publish' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Continue to publish' })).toBeInTheDocument();
  });
});
